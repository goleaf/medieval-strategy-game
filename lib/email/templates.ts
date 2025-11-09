import { EmailDeliverySchedule, EmailLanguage, EmailNotificationTopic } from "@prisma/client"

type LocalizedCopy = Record<string, string>

const COPY: Record<EmailLanguage, LocalizedCopy> = {
  EN: {
    attackIncomingSubject: "Incoming attack on {village}",
    attackReportSubject: "Battle report for {village}",
    conquestWarningSubject: "Loyalty critical at {village}",
    conquestLostSubject: "Village {village} was conquered",
    tribeMessageSubject: "New tribe message: {subject}",
    trainingCompleteSubject: "Training complete in {village}",
    buildingCompleteSubject: "{building} finished in {village}",
    digestSubjectDaily: "Daily summary",
    digestSubjectHourly: "Hourly digest",
    digestIntro: "Here is what happened while you were away:",
    viewDetails: "View details",
    unsubscribe: "Unsubscribe",
    verifyHeadline: "Confirm your email for battle alerts",
    verifyBody: "Use the link below to verify that we can reach you with urgent notifications.",
    verifyButton: "Verify email",
  },
  DE: {
    attackIncomingSubject: "Angriff auf {village}",
    attackReportSubject: "Kampfbericht für {village}",
    conquestWarningSubject: "Loyalität kritisch in {village}",
    conquestLostSubject: "Dorf {village} wurde erobert",
    tribeMessageSubject: "Neue Stammesnachricht: {subject}",
    trainingCompleteSubject: "Ausbildung abgeschlossen in {village}",
    buildingCompleteSubject: "{building} fertiggestellt in {village}",
    digestSubjectDaily: "Tägliche Zusammenfassung",
    digestSubjectHourly: "Stündige Übersicht",
    digestIntro: "Das ist passiert, während du offline warst:",
    viewDetails: "Details ansehen",
    unsubscribe: "Abmelden",
    verifyHeadline: "Bestätige deine E-Mail für Warnungen",
    verifyBody: "Nutze den folgenden Link, um dringende Benachrichtigungen zu erhalten.",
    verifyButton: "E-Mail bestätigen",
  },
}

const topicLabel: Record<EmailNotificationTopic, Record<EmailLanguage, string>> = {
  ATTACK_INCOMING: {
    EN: "Incoming attack",
    DE: "Eintreffender Angriff",
  },
  ATTACK_REPORT: {
    EN: "Battle report",
    DE: "Kampfbericht",
  },
  CONQUEST_WARNING: {
    EN: "Conquest danger",
    DE: "Eroberungsgefahr",
  },
  CONQUEST_LOST: {
    EN: "Village conquered",
    DE: "Dorf verloren",
  },
  TRIBE_MESSAGE: {
    EN: "Tribe message",
    DE: "Stammesnachricht",
  },
  TRAINING_COMPLETE: {
    EN: "Training complete",
    DE: "Ausbildung abgeschlossen",
  },
  BUILDING_COMPLETE: {
    EN: "Construction complete",
    DE: "Bau abgeschlossen",
  },
  DAILY_SUMMARY: {
    EN: "Daily summary",
    DE: "Tägliche Zusammenfassung",
  },
}

export interface TemplateEventPayload {
  topic: EmailNotificationTopic
  payload: Record<string, any>
  linkTarget?: string | null
}

export interface NotificationTemplateArgs {
  mode: "single" | "digest"
  events: TemplateEventPayload[]
  language: EmailLanguage
  schedule: EmailDeliverySchedule
  unsubscribeUrl: string
  appOrigin: string
}

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

const htmlShell = (body: string) => `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        padding: 0;
        background: #0b1019;
        color: #e6edf5;
      }
      .container {
        max-width: 520px;
        margin: 0 auto;
        padding: 24px;
      }
      .card {
        background: #111827;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      }
      h1, h2, h3 {
        color: #f1f5f9;
      }
      a.button {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 18px;
        background: #BE123C;
        color: #fff;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
      }
      .event {
        border-top: 1px solid rgba(255,255,255,0.08);
        padding-top: 16px;
        margin-top: 16px;
      }
      .footer {
        margin-top: 24px;
        text-align: center;
        font-size: 13px;
        color: rgba(255,255,255,0.6);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        ${body}
      </div>
    </div>
  </body>
</html>`

const textShell = (lines: string[]) => `${lines.join("\n\n")}
`

const format = (template: string, vars: Record<string, string | number | undefined>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""))

function summarizeEvent(event: TemplateEventPayload, lang: EmailLanguage): { title: string; body: string[] } {
  const payload = event.payload || {}
  switch (event.topic) {
    case EmailNotificationTopic.ATTACK_INCOMING:
      return {
        title: topicLabel.ATTACK_INCOMING[lang],
        body: [
          `${payload.attacker?.name ?? "Unknown"} ➜ ${payload.defender?.village ?? "village"} (${payload.attackType ?? ""})`,
          `Landing: ${payload.arrivalAt ? new Date(payload.arrivalAt).toLocaleString() : "soon"}`,
          `Units: ${payload.unitCount ?? "?"}`,
        ],
      }
    case EmailNotificationTopic.ATTACK_REPORT:
      return {
        title: topicLabel.ATTACK_REPORT[lang],
        body: [
          `Outcome: ${payload.attackerWon ? "Victory" : "Defeat"}`,
          `Loot: ${Object.entries(payload.loot ?? {})
            .map(([key, value]) => `${key}:${value}`)
            .join(" ")}`,
          `Casualties A/D: ${payload.casualties?.attackers ?? 0}/${payload.casualties?.defenders ?? 0}`,
        ],
      }
    case EmailNotificationTopic.CONQUEST_WARNING:
      return {
        title: topicLabel.CONQUEST_WARNING[lang],
        body: [
          `Village: ${payload.village?.name ?? ""}`,
          `Loyalty: ${payload.loyalty ?? "?"}`,
          payload.recommendation ?? "",
        ],
      }
    case EmailNotificationTopic.CONQUEST_LOST:
      return {
        title: topicLabel.CONQUEST_LOST[lang],
        body: [
          `Village: ${payload.village?.name ?? ""}`,
          `New owner: ${payload.newOwner?.name ?? ""}`,
        ],
      }
    case EmailNotificationTopic.TRIBE_MESSAGE:
      return {
        title: topicLabel.TRIBE_MESSAGE[lang],
        body: [
          `${payload.sender ?? ""} (${payload.tribe ?? ""})`,
          payload.subject ?? "",
          payload.preview ?? "",
        ],
      }
    case EmailNotificationTopic.TRAINING_COMPLETE:
      return {
        title: topicLabel.TRAINING_COMPLETE[lang],
        body: [
          `${payload.unitType ?? ""} × ${payload.quantity ?? 0}`,
          `Village: ${payload.village?.name ?? ""}`,
        ],
      }
    case EmailNotificationTopic.BUILDING_COMPLETE:
      return {
        title: topicLabel.BUILDING_COMPLETE[lang],
        body: [
          `${payload.buildingType ?? ""} → level ${payload.level ?? ""}`,
          `Village: ${payload.village?.name ?? ""}`,
        ],
      }
    default:
      return {
        title: topicLabel[event.topic][lang],
        body: [JSON.stringify(payload)],
      }
  }
}

export function renderNotificationEmail(args: NotificationTemplateArgs): RenderedEmail {
  const copy = COPY[args.language] ?? COPY.EN
  const [first] = args.events
  let subject = "Notification"

  if (args.mode === "single" && first) {
    switch (first.topic) {
      case EmailNotificationTopic.ATTACK_INCOMING:
        subject = format(copy.attackIncomingSubject, { village: first.payload?.defender?.village ?? "" })
        break
      case EmailNotificationTopic.ATTACK_REPORT:
        subject = format(copy.attackReportSubject, { village: first.payload?.defender?.village ?? "" })
        break
      case EmailNotificationTopic.CONQUEST_WARNING:
        subject = format(copy.conquestWarningSubject, { village: first.payload?.village?.name ?? "" })
        break
      case EmailNotificationTopic.CONQUEST_LOST:
        subject = format(copy.conquestLostSubject, { village: first.payload?.village?.name ?? "" })
        break
      case EmailNotificationTopic.TRIBE_MESSAGE:
        subject = format(copy.tribeMessageSubject, { subject: first.payload?.subject ?? "" })
        break
      case EmailNotificationTopic.TRAINING_COMPLETE:
        subject = format(copy.trainingCompleteSubject, { village: first.payload?.village?.name ?? "" })
        break
      case EmailNotificationTopic.BUILDING_COMPLETE:
        subject = format(copy.buildingCompleteSubject, {
          village: first.payload?.village?.name ?? "",
          building: first.payload?.buildingType ?? "",
        })
        break
      default:
        subject = topicLabel[first.topic][args.language]
    }
  } else if (args.mode === "digest") {
    subject =
      args.schedule === EmailDeliverySchedule.DAILY
        ? copy.digestSubjectDaily
        : copy.digestSubjectHourly
  }

  const sections = args.events.map((event) => summarizeEvent(event, args.language))

  const htmlEvents = sections
    .map(
      (section, index) => `<div class="event">
        <h3>${section.title}</h3>
        <p>${section.body.filter(Boolean).join("<br/>")}</p>
        ${
          args.events[index].linkTarget
            ? `<a class="button" href="${args.appOrigin}${args.events[index].linkTarget}" target="_blank" rel="noopener noreferrer">${copy.viewDetails}</a>`
            : ""
        }
      </div>`,
    )
    .join("")

  const html = htmlShell(`
    <h2>${args.mode === "digest" ? copy.digestIntro : sections[0]?.title ?? subject}</h2>
    ${htmlEvents}
    <div class="footer">
      <a href="${args.unsubscribeUrl}" target="_blank" rel="noopener noreferrer">${copy.unsubscribe}</a>
    </div>
  `)

  const textLines = sections.flatMap((section, index) => [
    `* ${section.title}`,
    ...section.body.map((line) => `  - ${line}`),
    args.events[index].linkTarget ? `  ${copy.viewDetails}: ${args.appOrigin}${args.events[index].linkTarget}` : "",
  ])

  textLines.push(`${copy.unsubscribe}: ${args.unsubscribeUrl}`)

  return {
    subject,
    text: textShell(textLines.filter(Boolean)),
    html,
  }
}

export function renderVerificationEmail(args: { language: EmailLanguage; verifyUrl: string }): RenderedEmail {
  const copy = COPY[args.language] ?? COPY.EN
  const html = htmlShell(`
    <h2>${copy.verifyHeadline}</h2>
    <p>${copy.verifyBody}</p>
    <a class="button" href="${args.verifyUrl}" target="_blank" rel="noopener noreferrer">${copy.verifyButton}</a>
  `)

  const text = textShell([copy.verifyHeadline, copy.verifyBody, args.verifyUrl])

  return {
    subject: copy.verifyHeadline,
    text,
    html,
  }
}
