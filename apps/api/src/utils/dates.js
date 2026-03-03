import dayjs from "dayjs";

export function todayISO() {
  return dayjs().format("YYYY-MM-DD");
}

export function nowISO() {
  return dayjs().format("YYYY-MM-DD HH:mm:ss");
}

export function isExpired(expiryDate) {
  // expiryDate: YYYY-MM-DD
  return dayjs(expiryDate).endOf("day").isBefore(dayjs());
}
