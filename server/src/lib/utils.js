export function jsonOk(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}
export function jsonErr(res, message = 'Bad Request', status = 400) {
  return res.status(status).json({ ok: false, error: { message } });
}