
// SHARED WRAPPER (private — sirf isi file me use)

function wrapEmailTemplate({ title, heading, bodyHtml, accent = "#4F46E5" }) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:${accent};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                This is an automated message. Please do not reply.<br/>
                © ${new Date().getFullYear()} TeamFlow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
}


// 1. TASK ASSIGNED

function getTaskAssignedHtml(name, payload = {}) {
    const {
        taskTitle = "Untitled task",
        projectName = "a project",
        actorName = "Someone",
        projectId = "",
        taskId = ""
    } = payload

    const taskUrl = process.env.CLIENT_URL
        ? `${process.env.CLIENT_URL}/projects/${projectId}?task=${taskId}`
        : "#"

    return wrapEmailTemplate({
        title: "New Task Assigned",
        heading: "🎯 New Task Assigned",
        accent: "#4F46E5",
        bodyHtml: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                <strong>${actorName}</strong> assigned you a new task in <strong>${projectName}</strong>.
            </p>
            <div style="background:#eff6ff;border-left:4px solid #4F46E5;padding:20px;border-radius:4px;margin:0 0 24px;">
                <p style="margin:0;font-size:18px;font-weight:600;color:#111827;">
                    ${taskTitle}
                </p>
            </div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                    <td style="background:#4F46E5;border-radius:6px;">
                        <a href="${taskUrl}" style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                            View Task
                        </a>
                    </td>
                </tr>
            </table>
        `
    })
}


// 2. COMMENT ADDED / MENTION

function getCommentAddedHtml(name, payload = {}) {
    const {
        taskTitle = "a task",
        commentPreview = "",
        actorName = "Someone",
        projectId = "",
        taskId = ""
    } = payload

    const taskUrl = process.env.CLIENT_URL
        ? `${process.env.CLIENT_URL}/projects/${projectId}?task=${taskId}`
        : "#"

    return wrapEmailTemplate({
        title: "New Comment",
        heading: "💬 New Comment",
        accent: "#7C3AED",
        bodyHtml: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${name},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
                <strong>${actorName}</strong> commented on <strong>${taskTitle}</strong>:
            </p>
            <div style="background:#f9fafb;border-left:4px solid #7C3AED;padding:16px 20px;border-radius:4px;margin:0 0 24px;">
                <p style="margin:0;font-size:14px;color:#374151;font-style:italic;line-height:1.6;">
                    "${commentPreview}"
                </p>
            </div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                    <td style="background:#7C3AED;border-radius:6px;">
                        <a href="${taskUrl}" style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                            Reply
                        </a>
                    </td>
                </tr>
            </table>
        `
    })
}


// 3. DUE SOON REMINDER

function getDueSoonHtml(name, payload = {}) {
    const {
        taskTitle = "a task",
        dueDate = null,
        projectId = "",
        taskId = ""
    } = payload

    const formattedDue = dueDate
        ? new Date(dueDate).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
        : "soon"

    const taskUrl = process.env.CLIENT_URL
        ? `${process.env.CLIENT_URL}/projects/${projectId}?task=${taskId}`
        : "#"

    return wrapEmailTemplate({
        title: "Task Due Soon",
        heading: "⏰ Task Due Soon",
        accent: "#EA580C",
        bodyHtml: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                This task is due in less than 24 hours. Don't forget to complete it!
            </p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">
                    ${taskTitle}
                </p>
                <p style="margin:0;font-size:14px;color:#c2410c;font-weight:500;">
                    Due: ${formattedDue}
                </p>
            </div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                    <td style="background:#EA580C;border-radius:6px;">
                        <a href="${taskUrl}" style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                            Open Task
                        </a>
                    </td>
                </tr>
            </table>
        `
    })
}

module.exports = { getTaskAssignedHtml, getCommentAddedHtml, getDueSoonHtml }