import { initialTasks, taskStatuses } from "./tasks.js";
import { isValidReviewData } from "./taskReview.js";

export const taskStorageKey = "ieum.tasks.v1";

function isValidHistory(history) {
  return Array.isArray(history) && history.every((entry) =>
    entry && taskStatuses.includes(entry.fromStatus) &&
    taskStatuses.includes(entry.toStatus) &&
    typeof entry.reason === "string" &&
    entry.reason.trim().length > 0 &&
    typeof entry.changedAt === "string" &&
    Number.isFinite(Date.parse(entry.changedAt)) &&
    entry.actorRole === "admin"
  );
}

export function readTaskState(storage) {
  try {
    const saved = storage.getItem(taskStorageKey);
    if (saved === null) return { tasks: initialTasks, storageError: "" };

    const tasks = JSON.parse(saved);
    if (!Array.isArray(tasks) || tasks.some((task) =>
      !task || !["number", "string"].includes(typeof task.id) ||
      typeof task.title !== "string" || !taskStatuses.includes(task.status) ||
      (task.statusHistory !== undefined && !isValidHistory(task.statusHistory)) ||
      !isValidReviewData(task)
    ) || new Set(tasks.map((task) => task.id)).size !== tasks.length) {
      throw new Error("invalid saved tasks");
    }
    return { tasks, storageError: "" };
  } catch {
    return {
      tasks: initialTasks,
      storageError: "저장된 요청을 불러올 수 없어 초기 요청을 표시합니다. 기존 데이터 보호를 위해 상태 저장을 중단했습니다. 브라우저의 저장 설정이나 저장 데이터를 확인해주세요."
    };
  }
}

export function changeTaskStatus(tasks, taskId, nextStatus, reason) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("요청을 찾을 수 없습니다.");
  if (!taskStatuses.includes(nextStatus)) {
    throw new Error("팀에서 정한 요청 상태를 선택해주세요.");
  }
  if (task.status === nextStatus) throw new Error("현재 상태와 다른 상태를 선택해주세요.");
  if (typeof reason !== "string" || !reason.trim()) {
    throw new Error("상태 변경 사유를 입력해주세요.");
  }

  return tasks.map((item) => item.id !== taskId ? item : {
    ...item,
    status: nextStatus,
    statusHistory: [
      ...(item.statusHistory ?? []),
      {
        fromStatus: item.status,
        toStatus: nextStatus,
        reason: reason.trim(),
        changedAt: new Date().toISOString(),
        actorRole: "admin"
      }
    ]
  });
}

export function saveTasks(storage, tasks) {
  try {
    storage.setItem(taskStorageKey, JSON.stringify(tasks));
  } catch {
    throw new Error("브라우저에 저장하지 못해 변경사항을 적용하지 않았습니다. 저장 공간과 브라우저 설정을 확인해주세요.");
  }
}
