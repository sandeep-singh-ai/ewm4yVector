// Replies to greetings and small talk, which are not in the Q&A knowledge base.
// Checked before the vector search; returns null when the message is a real question.

const GREETING =
  /^(hi+|hello+|hey+|hiya|yo|howdy|greetings|good (morning|afternoon|evening|day)|bonjour|salut|hola|buenos dias|buenas( tardes| noches)?|namaste|namaskar|sat sri akal|salam|salaam|as?salam(u|o) ?alaikum|marhaba|ni ?hao|你好|kumusta|xin chao|annyeong|ola|oi)( there| aster| everyone| all)?$/;
const HOW_ARE_YOU = /^(how are (you|u)|how r u|how('?s| is) it going|what'?s up|sup|wassup)( today| aster)?$/;
const THANKS = /^(thanks?( you)?( so much| very much| a lot)?|thx|ty|thank u|merci|gracias|shukriya|dhanyavaad|xie xie|谢谢|salamat)( aster)?$/;
const BYE = /^(bye+|goodbye|good bye|see (you|ya)|take care|good night|ciao|adios|au revoir)( aster)?$/;
const WHO = /^(who are (you|u)|what are (you|u)|what is this|what can (you|u) do|what do (you|u) do|help|can (you|u) help( me)?)$/;
const ACK = /^(ok(ay)?|k|cool|got it|alright|fine|yes|no|sure)$/;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "días" -> "dias"
    .replace(/[^\p{L}\p{N}\s']/gu, " ") // drop punctuation and emoji
    .replace(/\s+/g, " ")
    .trim();
}

export function smallTalkReply(message: string): string | null {
  const t = normalize(message);
  if (!t) return null;

  if (GREETING.test(t))
    return "Hi, I'm Aster 💙 I'm here to listen and help you. You can ask me about safety, finding help, legal questions, immigration, or support for children and youth. What would you like to know? If you are in danger right now, please call 911.";
  if (HOW_ARE_YOU.test(t))
    return "Thank you for asking. I'm here and ready to help you. How are you feeling today? You can tell me what's on your mind, or pick one of the suggestions below.";
  if (THANKS.test(t))
    return "You're welcome. I'm glad I could help. Is there anything else you would like to know?";
  if (BYE.test(t))
    return "Take care of yourself. You can come back any time. If you are ever in danger, call 911. VictimLinkBC is available 24/7 by call or text at 1-800-563-0808.";
  if (WHO.test(t))
    return "I'm Aster, an AI companion that shares safety information and support resources for immigrant women and youth in BC. I can answer questions about recognizing abuse, staying safe, finding help, legal options, immigration, tech safety, and children and youth. I'm not a substitute for professional or emergency services. In an emergency, call 911.";
  if (ACK.test(t))
    return "Okay. What would you like to know? You can type a question or pick one of the suggestions below.";
  return null;
}
