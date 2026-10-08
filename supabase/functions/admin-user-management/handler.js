import { localPhone, validateUserEdit } from "../../../src/data/userManagement.js";

function checked(result, message) {
  if (result.error) throw new Error(message);
  return result.data;
}

async function privateFiles(client, folder) {
  const paths = [];
  for (let offset = 0; ; offset += 100) {
    const rows = checked(await client.storage.from("ieum-private").list(folder, {
      limit: 100, offset, sortBy: { column: "name", order: "asc" },
    }), "회원 파일 목록을 확인하지 못했습니다. 삭제를 중단했습니다.");
    for (const row of rows) {
      const path = `${folder}/${row.name}`;
      if (row.id) paths.push(path);
      else paths.push(...await privateFiles(client, path));
    }
    if (rows.length < 100) return paths;
  }
}

export function createUserManagementHandler(client, allowedOrigins) {
  return async (request) => {
    const origin = request.headers.get("Origin");
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowedOrigins.includes(origin)) return reply({ error: "허용되지 않은 서비스 주소입니다." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "지원하지 않는 요청입니다." }, 405);
    const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply({ error: "운영자 로그인이 필요합니다." }, 401);
    const auth = await client.auth.getUser(token);
    if (auth.error || !auth.data.user) return reply({ error: "로그인이 만료되었습니다. 다시 로그인해주세요." }, 401);
    const actorResult = await client.from("profiles").select("id,role").eq("id", auth.data.user.id).single();
    if (actorResult.error || actorResult.data.role !== "admin") return reply({ error: "운영자만 이용할 수 있습니다." }, 403);

    let operation;
    let target;
    let originalAuth;
    let authChanged = false;
    let deleted = false;
    let filesRemoved = false;
    try {
      const text = await request.text();
      if (text.length > 8000) throw new Error("입력 내용이 너무 깁니다.");
      const fields = JSON.parse(text);
      if (!fields || !["update", "delete"].includes(fields.action) ||
          typeof fields.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(fields.userId)) {
        throw new Error("회원 처리 요청을 확인해주세요.");
      }
      target = checked(await client.from("profiles").select("*").eq("id", fields.userId).single(), "회원을 찾을 수 없습니다.");
      if (!["student", "requester"].includes(target.role)) throw new Error("운영자 계정은 수정·삭제할 수 없습니다.");
      const values = fields.action === "update" ? validateUserEdit(fields) : fields;
      if (typeof values.reason !== "string" || !values.reason.trim() || values.reason.trim().length > 500) {
        throw new Error("처리 사유를 1~500자로 입력해주세요.");
      }
      if (fields.action === "update" && values.name === target.name && values.phone === localPhone(target.phone || "")) {
        throw new Error("변경된 정보가 없습니다.");
      }
      // JWT로 확인한 운영자 ID만 사용합니다. 요청 본문의 actor/role은 신뢰하지 않습니다.
      const begun = await client.rpc("begin_ieum_user_management", {
        p_actor: auth.data.user.id, p_target: target.id, p_action: fields.action,
        p_reason: values.reason.trim(), p_confirm_name: fields.confirmName || null,
      });
      if (begun.error) throw new Error(begun.error.message);
      operation = begun.data;
      target = checked(await client.from("profiles").select("*").eq("id", fields.userId).single(),
        "잠긴 회원 정보를 다시 확인하지 못했습니다.");

      if (fields.action === "update") {
        originalAuth = checked(await client.auth.admin.getUserById(target.id), "로그인 계정을 확인하지 못했습니다.").user;
        const phoneChanged = values.phone !== localPhone(target.phone || "");
        if (phoneChanged) {
          checked(await client.auth.admin.updateUserById(target.id, {
            email: `phone-82${values.phone.slice(1)}@login.ieum.invalid`, email_confirm: true,
          }), "전화번호 변경에 실패했습니다. 이미 가입된 번호인지 확인해주세요.");
          authChanged = true;
        }
        checked(await client.rpc("complete_ieum_user_update", {
          p_operation: operation, p_name: values.name, p_phone: values.phone,
        }), "회원 정보 저장에 실패했습니다. 중복 번호 또는 DB 설정을 확인해주세요.");
        return reply({ success: true });
      }

      // DB의 삭제 준비 단계에서 연결 기록을 다시 확인하고 새 기록 연결을 잠급니다.
      const paths = await privateFiles(client, target.id);
      for (let offset = 0; offset < paths.length; offset += 100) {
        checked(await client.storage.from("ieum-private").remove(paths.slice(offset, offset + 100)),
          "파일 정리에 실패해 계정 삭제를 중단했습니다.");
        filesRemoved = true;
      }
      checked(await client.auth.admin.deleteUser(target.id), "계정 삭제에 실패했습니다. 연결 기록과 파일을 다시 확인해주세요.");
      deleted = true;
      const finished = await client.rpc("finish_ieum_user_management", { p_operation: operation, p_success: true });
      return reply({ success: true, warning: finished.error ? "회원은 삭제됐지만 감사 기록 완료 처리에 실패했습니다. 운영 기록을 확인해주세요." : "" });
    } catch (failure) {
      let rollbackFailed = false;
      if (authChanged && originalAuth) {
        const restored = await client.auth.admin.updateUserById(target.id, { email: originalAuth.email, email_confirm: true });
        rollbackFailed = Boolean(restored.error);
      }
      if (operation && !deleted && !rollbackFailed) {
        const unlocked = await client.rpc("finish_ieum_user_management", { p_operation: operation, p_success: false });
        rollbackFailed = Boolean(unlocked.error);
      }
      // 복구 실패 시 잠금을 유지해 불일치한 계정이 계속 변경되지 않도록 합니다.
      const message = rollbackFailed
        ? "계정 복구 또는 잠금 해제에 실패했습니다. Supabase에서 로그인 정보와 pending 운영 기록을 확인해주세요."
        : failure instanceof SyntaxError ? "입력 형식이 올바르지 않습니다."
          : failure instanceof Error ? failure.message : "회원 처리를 완료하지 못했습니다.";
      return reply({ error: message + (filesRemoved && !deleted ? " 일부 회원 파일은 이미 삭제됐을 수 있습니다." : "") }, 400);
    }
  };
}
