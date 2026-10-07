import test from "node:test";
import assert from "node:assert/strict";
import { phoneLoginEmail } from "../src/data/accountAuth.js";

test("phone login alias uses a canonical Korean country code", () => {
  assert.equal(phoneLoginEmail("010-6691-0174"), "phone-821066910174@login.ieum.invalid");
  assert.equal(phoneLoginEmail("01066910174"), "phone-821066910174@login.ieum.invalid");
});

test("phone login alias rejects implausible phone lengths", () => {
  assert.throws(() => phoneLoginEmail("123"), /휴대전화 번호/);
  assert.throws(() => phoneLoginEmail("010123456789"), /휴대전화 번호/);
});
