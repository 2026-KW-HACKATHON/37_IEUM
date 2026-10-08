import test from "node:test";
import assert from "node:assert/strict";
import { getStudentSummary } from "../src/data/studentSummary.js";

const completed = (at, minutes = 30) => ({
  status: "인증 완료", certification: { certifiedAt: at },
  submissions: [{ review: { recognizedMinutes: minutes } }],
});

test("이번 달은 한국 시간 인증 완료일로 집계하고 누적 시간·인증 수는 유지한다", () => {
  const assignments = [
    completed("2026-09-30T14:59:59Z", 10),
    completed("2026-09-30T15:00:00Z", 20),
    completed("2026-10-01T09:00:00+09:00", 40),
    { ...completed("2026-10-02T00:00:00Z"), status: "승인" },
  ];
  assert.deepEqual(getStudentSummary(assignments, new Date("2026-10-08T00:00:00Z")), {
    monthlyCount: 2, totalMinutes: 70, verifiedCount: 3,
  });
});

test("인증 날짜 누락·오류·미래 날짜는 월별 건수에서 제외한다", () => {
  const assignments = [completed(null), completed("invalid"), completed("2026-10-09T00:00:00Z")];
  assert.equal(getStudentSummary(assignments, new Date("2026-10-08T00:00:00Z")).monthlyCount, 0);
});

test("한국 시간의 월말과 연말 경계를 처리한다", () => {
  assert.equal(getStudentSummary([
    completed("2026-10-31T14:59:59Z"), completed("2026-10-31T15:00:00Z"),
  ], new Date("2026-11-01T00:00:00Z")).monthlyCount, 1);
  assert.equal(getStudentSummary([
    completed("2026-12-31T14:59:59Z"), completed("2026-12-31T15:00:00Z"),
  ], new Date("2027-01-01T00:00:00Z")).monthlyCount, 1);
  assert.deepEqual(getStudentSummary([], new Date("2026-10-08T00:00:00Z")), {
    monthlyCount: 0, totalMinutes: 0, verifiedCount: 0,
  });
});
