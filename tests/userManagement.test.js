import test from "node:test";
import assert from "node:assert/strict";
import { editLocalUser, deleteLocalUser, localPhone, validateUserEdit } from "../src/data/userManagement.js";
import { createUserManagementHandler } from "../supabase/functions/admin-user-management/handler.js";

const admin = { id: "admin-1", role: "admin" };
const memberId = "11111111-1111-4111-8111-111111111111";
const users = [
  { id: memberId, role: "student", name: "학생", phone: "+821012345678", passwordHash: "keep", verificationStatus: "approved" },
  { id: "other", role: "requester", name: "가족", phone: "01087654321" },
  admin,
];
const empty = { requests: [], applications: [], assignments: [], activities: [] };
const edit = { name: "수정 이름", phone: "010-1234-5679", reason: "회원 요청" };

test("기본정보 수정은 번호를 정규화하고 비밀번호·역할·검증 결과를 보존한다", () => {
  const updated = editLocalUser(users, memberId, edit, admin)[0];
  assert.equal(updated.phone, "01012345679");
  assert.equal(updated.passwordHash, "keep");
  assert.equal(updated.verificationStatus, "approved");
  assert.equal(updated.role, "student");
  assert.equal(updated.managementHistory[0].actorId, admin.id);
  assert.deepEqual(updated.managementHistory[0].changedFields, ["name", "phone"]);
  assert.equal(users[0].name, "학생");
  assert.equal(localPhone("+82 10-1234-5678"), "01012345678");
});

test("운영자 외 수정·운영자 계정 변경·중복 번호·빈 사유·형식 오류를 차단한다", () => {
  assert.throws(() => editLocalUser(users, memberId, edit, users[0]), /운영자만/);
  assert.throws(() => editLocalUser(users, admin.id, edit, admin), /일반 회원/);
  assert.throws(() => editLocalUser(users, memberId, { ...edit, phone: "+821087654321" }, admin), /다른 회원/);
  assert.throws(() => validateUserEdit({ ...edit, reason: " " }), /처리 사유/);
  assert.throws(() => validateUserEdit({ ...edit, phone: "123" }), /전화번호/);
  assert.throws(() => validateUserEdit({ ...edit, name: "x".repeat(51) }), /이름/);
  assert.throws(() => editLocalUser(users, memberId, { ...edit, name: "학생", phone: "01012345678" }, admin), /변경된 정보/);
});

test("회원 삭제는 이름 확인과 사유가 필요하고 연결 기록이 있으면 막는다", () => {
  const fields = { confirmName: "학생", reason: "본인 삭제 요청" };
  assert.equal(deleteLocalUser(users, memberId, fields, empty, admin).length, 2);
  assert.throws(() => deleteLocalUser(users, memberId, { ...fields, confirmName: "다른 회원" }, empty, admin), /정확히/);
  for (const [collection, owner] of [["requests", "requesterId"], ["applications", "studentId"], ["assignments", "studentId"]]) {
    assert.throws(() => deleteLocalUser(users, memberId, fields, { ...empty, [collection]: [{ [owner]: memberId }] }, admin), /연결된/);
  }
  assert.throws(() => deleteLocalUser([...users, { id: "linked", linkedElderId: memberId }], memberId, fields, empty, admin), /연결 정보/);
});

function mockClient(options = {}) {
  const calls = [];
  const ok = (data) => ({ data, error: null });
  const bad = () => ({ data: null, error: { message: "blocked" } });
  const client = {
    calls,
    auth: {
      getUser: async (token) => token === "valid" ? ok({ user: { id: admin.id } }) : bad(),
      admin: {
        getUserById: async () => ok({ user: { email: "old@login.ieum.invalid" } }),
        updateUserById: async (id, values) => {
          calls.push(["auth-update", id, values]);
          return options.authFailure && values.email !== "old@login.ieum.invalid" ? bad() : ok({});
        },
        deleteUser: async (id) => { calls.push(["auth-delete", id]); return ok({}); },
      },
    },
    from: () => {
      let id;
      return { select() { return this; }, eq(_key, value) { id = value; return this; },
        async single() { return ok(id === admin.id ? { ...admin, role: options.actorRole || "admin" } : users[0]); },
      };
    },
    rpc: async (name, values) => {
      calls.push([name, values]);
      if (options.blockDeletion && name === "begin_ieum_user_management") return bad();
      if (options.saveFailure && name === "complete_ieum_user_update") return bad();
      return ok(name === "begin_ieum_user_management" ? "operation-1" : null);
    },
    storage: { from: () => ({
      list: async (folder) => {
        calls.push(["list", folder]);
        return ok(folder === memberId ? [{ name: "verification", id: null }] : [{ name: "proof.pdf", id: "file-1" }]);
      },
      remove: async (paths) => { calls.push(["remove", paths]); return options.fileFailure ? bad() : ok(paths); },
    }) },
  };
  return client;
}

function request(body, token = "valid", origin = "https://37-ieum.vercel.app") {
  return new Request("https://example.supabase.co/functions/v1/admin-user-management", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ userId: memberId, ...body }),
  });
}
const handler = (client) => createUserManagementHandler(client, ["https://37-ieum.vercel.app"]);

test("서버는 위조 역할·만료 토큰·허용되지 않은 출처를 차단하고 어떤 변경도 하지 않는다", async () => {
  for (const options of [{ actorRole: "student" }, {}]) {
    const client = mockClient(options);
    const response = await handler(client)(request({ action: "delete", actor: admin }, options.actorRole ? "valid" : "invalid"));
    assert.ok([401, 403].includes(response.status));
    assert.deepEqual(client.calls, []);
  }
  const client = mockClient();
  assert.equal((await handler(client)(request({ action: "delete" }, "valid", "https://untrusted.example"))).status, 403);
  assert.deepEqual(client.calls, []);
});

test("서버 수정은 전화번호 로그인 별칭을 갱신하고 JWT의 운영자 ID로 기록한다", async () => {
  const client = mockClient();
  const response = await handler(client)(request({ action: "update", ...edit, actorId: "forged" }));
  assert.equal(response.status, 200);
  assert.equal(client.calls[0][1].p_actor, admin.id);
  assert.equal(client.calls[1][2].email, "phone-821012345679@login.ieum.invalid");
  assert.equal(client.calls[2][1].p_phone, "01012345679");
});

test("DB 저장 실패 시 로그인 별칭을 원복한 후 잠금을 해제한다", async () => {
  const client = mockClient({ saveFailure: true });
  assert.equal((await handler(client)(request({ action: "update", ...edit }))).status, 400);
  assert.equal(client.calls[3][2].email, "old@login.ieum.invalid");
  assert.equal(client.calls[4][0], "finish_ieum_user_management");
  assert.equal(client.calls[4][1].p_success, false);
});

test("이름만 수정하면 로그인 계정을 변경하지 않는다", async () => {
  const client = mockClient();
  assert.equal((await handler(client)(request({ action: "update", ...edit, phone: "01012345678" }))).status, 200);
  assert.equal(client.calls.filter((call) => call[0] === "auth-update").length, 0);
});

test("서버에서 연결 기록 삭제를 거부하면 파일과 계정을 건드리지 않는다", async () => {
  const client = mockClient({ blockDeletion: true });
  assert.equal((await handler(client)(request({ action: "delete", reason: "회원 요청", confirmName: "학생" }))).status, 400);
  assert.equal(client.calls.length, 1);
});

test("삭제는 개인 폴더의 파일을 정리한 후 계정 삭제와 감사 완료를 처리한다", async () => {
  const client = mockClient();
  assert.equal((await handler(client)(request({ action: "delete", reason: "회원 요청", confirmName: "학생" }))).status, 200);
  assert.deepEqual(client.calls[3], ["remove", [`${memberId}/verification/proof.pdf`]]);
  assert.equal(client.calls[4][0], "auth-delete");
  assert.equal(client.calls[5][1].p_success, true);
});

test("파일 삭제 실패 시 계정 삭제를 중단하고 잠금을 해제한다", async () => {
  const client = mockClient({ fileFailure: true });
  assert.equal((await handler(client)(request({ action: "delete", reason: "회원 요청", confirmName: "학생" }))).status, 400);
  assert.equal(client.calls.some((call) => call[0] === "auth-delete"), false);
  assert.equal(client.calls.at(-1)[1].p_success, false);
});
