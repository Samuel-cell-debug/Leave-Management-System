const SHEETS = { users: "Users", balances: "Balances", requests: "LeaveRequests" };

function doGet() {
  return json_({ ok: true, service: "Northstar Leave demo", message: "Use POST for actions." });
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || "{}");
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const result = route_(sheet, body);
    return json_({ ok: true, data: result });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function route_(spreadsheet, body) {
  const users = read_(spreadsheet.getSheetByName(SHEETS.users));
  const actor = users.find(user => user.email === body.email);
  if (body.action === "login") {
    if (!actor || actor.password !== body.password) throw new Error("Invalid email or password.");
      return workspace_(spreadsheet, actor);
  }
  if (!actor || actor.password !== body.password) throw new Error("Your session has expired. Please sign in again.");
  if (body.action === "submit") {
    const request = { id: `LV-${Date.now()}`, employee_id: actor.id, leave_type: body.leave.leave_type, start_date: body.leave.start_date, end_date: body.leave.end_date, days: body.leave.days, reason: body.leave.reason, handover: body.leave.handover, time_option: body.leave.time_option, status: "pending", applied_on: new Date().toISOString(), decision_comment: "" };
    append_(spreadsheet.getSheetByName(SHEETS.requests), request); return request;
  }
  if (body.action === "cancel") return updateStatus_(spreadsheet, actor, body.id, "cancelled", "");
  if (body.action === "decide") {
    if (actor.role !== "administrator") throw new Error("Administrator access required.");
    return updateStatus_(spreadsheet, actor, body.id, body.status, body.comment || "");
  }
    if (body.action === "refresh") return workspace_(spreadsheet, actor);
  throw new Error("Unknown action.");
}

  function workspace_(spreadsheet, actor) {
    const leaves = leaves_(spreadsheet);
    const balances = balances_(spreadsheet);
    const administrator = actor.role === "administrator";
    return { user: publicUser_(actor), leaves: administrator ? leaves : leaves.filter(leave => String(leave.employee_id) === String(actor.id)), balances: administrator ? balances : balances.filter(balance => String(balance.employee_id) === String(actor.id)), users: administrator ? publicUsers_(read_(spreadsheet.getSheetByName(SHEETS.users))) : [publicUser_(actor)] };
  }

function read_(sheet) { const values = sheet.getDataRange().getValues(); const headers = values.shift().map(String); return values.filter(row => row.some(Boolean)).map(row => headers.reduce((item, header, index) => { item[header] = row[index]; return item; }, {})); }
function leaves_(spreadsheet) { return read_(spreadsheet.getSheetByName(SHEETS.requests)); }
function balances_(spreadsheet) { return read_(spreadsheet.getSheetByName(SHEETS.balances)); }
function publicUser_(user) { return { id: String(user.id), full_name: user.full_name, job_title: user.job_title, department: user.department, role: user.role }; }
function publicUsers_(users) { return users.map(publicUser_); }
function append_(sheet, object) { const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.appendRow(headers.map(header => object[header] ?? "")); }
function updateStatus_(spreadsheet, actor, id, status, comment) { const sheet = spreadsheet.getSheetByName(SHEETS.requests); const rows = read_(sheet); const request = rows.find(item => String(item.id) === String(id)); if (!request) throw new Error("Request not found."); if (request.status !== "pending") throw new Error("Only pending requests can change status."); if (status === "cancelled" && request.employee_id !== actor.id) throw new Error("You can only cancel your own request."); if (!["approved", "rejected", "cancelled"].includes(status)) throw new Error("Invalid status."); if (status === "approved") decrementBalance_(spreadsheet, request.employee_id, request.leave_type, Number(request.days)); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; const rowIndex = rows.findIndex(item => String(item.id) === String(id)) + 2; const updates = { status, decision_comment: comment }; headers.forEach((header, index) => { if (header in updates) sheet.getRange(rowIndex, index + 1).setValue(updates[header]); }); return Object.assign(request, updates); }
function decrementBalance_(spreadsheet, employeeId, leaveType, days) { const sheet = spreadsheet.getSheetByName(SHEETS.balances); const rows = read_(sheet); const row = rows.find(item => String(item.employee_id) === String(employeeId) && item.leave_type === leaveType); if (!row || row.allowance === "unlimited") return; if (Number(row.remaining) < days) throw new Error("Insufficient leave balance."); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; const rowIndex = rows.findIndex(item => item.employee_id === employeeId && item.leave_type === leaveType) + 2; sheet.getRange(rowIndex, headers.indexOf("remaining") + 1).setValue(Number(row.remaining) - days); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }