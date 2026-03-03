import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export function makeCode(prefix = "VX") {
  return `${prefix}-${nanoid()}`;
}
