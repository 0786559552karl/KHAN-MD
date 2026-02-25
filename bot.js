/**
 * SIGMA MDX Bot - Standalone Deploy
 * Bot WhatsApp complet avec toutes les commandes bug
 * Préfixe par défaut: .
 */

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { Boom } from "@hapi/boom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =================== FONCTION UTILITAIRE ===================
const getContextInfo = (participant, forwardedNewsletterJid, forwardedNewsletterName) => {
  return {
    mentionedJid: participant ? [participant] : [],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterJid: forwardedNewsletterJid || "120363249464839913@newsletter",
    forwardedNewsletterName: forwardedNewsletterName || "⚡ SIGMA MDX CHANNEL ⚡"
  };
};

// =================== CONFIGURATION ===================
const config = {
  PREFIXE_COMMANDE: process.env.PREFIXE || ".",
  DOSSIER_AUTH: process.env.DOSSIER_AUTH || "session",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  RECONNECT_DELAY: parseInt(process.env.RECONNECT_DELAY) || 5000,
  SUPER_OWNER: "32491942744"
};

// =================== LOGGER ===================
const logger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: "pino-pretty",
    options: { colorize: true, ignore: "pid,hostname", translateTime: "HH:MM:ss" }
  },
  base: null
});

// =================== FICHIERS ===================
const CONFIG_PATH = "./config.json";
const MODE_PREFIX_FILE = "./modeprefix.json";
const SUDO_FILE = "./sudo.json";

// Init files
if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({ users: {}, owners: [] }, null, 2));
if (!fs.existsSync(MODE_PREFIX_FILE)) fs.writeFileSync(MODE_PREFIX_FILE, JSON.stringify({ modeprefix: true }, null, 2));
if (!fs.existsSync(SUDO_FILE)) fs.writeFileSync(SUDO_FILE, JSON.stringify([], null, 2));

// =================== UTILITAIRES ===================
const normalizeJid = (jid) => {
  if (!jid) return null;
  const base = String(jid).trim().split(":")[0];
  return base.includes("@") ? base : `${base}@s.whatsapp.net`;
};

const getBareNumber = (input) => {
  if (!input) return "";
  return String(input).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
};

const unwrapMessage = (m) => {
  return m?.ephemeralMessage?.message || m?.viewOnceMessageV2?.message || m?.viewOnceMessageV2Extension?.message || m?.documentWithCaptionMessage?.message || m?.viewOnceMessage?.message || m;
};

const pickText = (m) => {
  if (!m) return "";
  return (
    m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || 
    m.videoMessage?.caption || m.buttonsResponseMessage?.selectedButtonId || 
    m.listResponseMessage?.singleSelectReply?.selectedRowId || 
    m.templateButtonReplyMessage?.selectedId || m.reactionMessage?.text ||
    (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson || "{}")?.text || "" : "")
  );
};

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// =================== CONFIG / SUDO / MODE ===================
const getConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
const saveConfig = (cfg) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));

const setOwner = (user) => {
  const cfg = getConfig();
  if (!cfg.owners) cfg.owners = [];
  const add = (num) => { if (num && !cfg.owners.includes(num)) cfg.owners.push(num); };
  if (user?.id) add(getBareNumber(user.id));
  if (user?.lid) add(getBareNumber(user.lid));
  saveConfig(cfg);
  global.owners = cfg.owners;
  logger.info(`Owners: ${cfg.owners.join(", ")}`);
};

const loadModePrefix = () => {
  try { return JSON.parse(fs.readFileSync(MODE_PREFIX_FILE, "utf-8")).modeprefix ?? true; }
  catch { return true; }
};

const saveModePrefix = (state) => {
  fs.writeFileSync(MODE_PREFIX_FILE, JSON.stringify({ modeprefix: state }, null, 2));
  logger.info(`Mode prefix: ${state}`);
};
global.saveModePrefix = saveModePrefix;

const loadSudo = () => {
  if (!fs.existsSync(SUDO_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SUDO_FILE, "utf-8")); } catch { return []; }
};

// =================== BANNER ===================
const afficherBanner = () => {
  try { console.clear(); } catch {}
  console.log(chalk.cyan(`
╔══════════════════════════════╗
║   SIGMA MDX SYSTEM ONLINE    ║
╠══════════════════════════════╣
║  Version: 3.0 Standalone     ║
║  Prefix: .                   ║
╚══════════════════════════════╝
  `));
};

// =================== COMMANDES BUG ===================
const bugCommands = {}; // Chargées depuis commands/bug.js

// =================== COMMANDES DE BASE ===================
const baseCommands = {
  ping: {
    name: "ping",
    execute: async (sock, msg, args, from) => {
      await sock.sendMessage(from, { text: "🏓 Pong!", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
    }
  },
  owner: {
    name: "owner",
    execute: async (sock, msg, args, from) => {
      await sock.sendMessage(from, { text: "👨‍💻 Owner: MUZAN SIGMA\n📞 +32 491 942 744", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
    }
  },
  menu: {
    name: "menu",
    execute: async (sock, msg, args, from) => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600); 
      const minutes = Math.floor((uptime % 3600) / 60); 
      const seconds = Math.floor(uptime % 60);
      const menuText = `*SIGMA MDX MENU*\n\n` +
        `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
        `📱 Prefix: .\n` +
        `📦 Commandes: ${Object.keys(global.commands).length}\n\n` +
        `*Commandes de base:*\n` +
        `.ping - Test\n` +
        `.owner - Contact\n` +
        `.menu - Ce menu\n\n` +
        `*Commandes Bug (.bugmenu):*\n` +
        `.travas, .pending, .ghost\n` +
        `.brutal, .memek, .extend\n\n` +
        `*Menu complet:* .menu (commande externe)`;
      await sock.sendMessage(from, { text: menuText, contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
    }
  },
  autosee: {
    name: "autosee",
    execute: async (sock, msg, args, from) => {
      await sock.sendMessage(from, { text: "✅ Autosee activé pour les status", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
    }
  },
  autolike: {
    name: "autolike",
    execute: async (sock, msg, args, from) => {
      await sock.sendMessage(from, { text: "✅ Autolike activé pour les status", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
    }
  },
  autostatus: {
    name: "autostatus",
    execute: async (sock, msg, args, from) => {
      const cmd = args[0]?.toLowerCase();
      if (cmd === "on") {
        await sock.sendMessage(from, { text: "✅ Autostatus activé", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
      } else if (cmd === "off") {
        await sock.sendMessage(from, { text: "❌ Autostatus désactivé", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: "Usage: .autostatus on/off", contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg });
      }
    }
  }
};

// =================== LOAD COMMANDS ===================
async function loadCommands() {
  global.commands = { ...baseCommands, ...bugCommands };

  // Charger commands/ (y compris bug.js)
  const commandsDir = path.join(__dirname, "commands");
  if (fs.existsSync(commandsDir)) {
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"));
    console.log(`[LOAD] Found ${files.length} files in commands/: ${files.join(", ")}`);
    
    for (const file of files) {
      try {
        const filePath = path.join(commandsDir, file);
        const fileUrl = "file://" + filePath.replace(/\\/g, "/");
        const module = await import(fileUrl);
        
        // Si c'est bug.js qui exporte un tableau
        if (file === "bug.js" && Array.isArray(module.default)) {
          for (const cmd of module.default) {
            if (cmd?.name && typeof cmd.execute === "function") {
              global.commands[cmd.name.toLowerCase()] = cmd;
              logger.info(`Loaded bug command: ${cmd.name}`);
            }
          }
        }
        // Commande normale
        else {
          const cmd = module.default || module;
          
          if (cmd?.name && typeof cmd.execute === "function") {
            global.commands[cmd.name.toLowerCase()] = cmd;
            logger.info(`Loaded command: ${cmd.name} (${file})`);
          }
        }
      } catch (e) {
        logger.error(`Failed to load ${file}:`, e.message);
        console.error(`[LOAD] ERROR ${file}:`, e.message, e.stack);
      }
    }
  }

  logger.info(`Total commands loaded: ${Object.keys(global.commands).length}`);
}

// =================== QUESTION ===================
function askQuestion(query) {
  return new Promise((resolve) => {
    process.stdout.write(chalk.cyan.bold(query));
    process.stdin.resume();
    process.stdin.once("data", (data) => { process.stdin.pause(); resolve(data.toString().trim()); });
  });
}

// =================== START BOT ===================
let reconnectCount = 0;
let lastWelcomeTime = 0;

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.DOSSIER_AUTH);
  const { version } = await fetchLatestBaileysVersion();

  global.isPrefixMode = loadModePrefix();

  const sock = makeWASocket({
    version, printQRInTerminal: false, logger: pino({ level: "silent" }),
    auth: state, browser: ["Ubuntu", "Chrome", "20.0.04"], msgRetryCounterCache: new Map()
  });

  sock.ev.on("creds.update", saveCreds);

  let phoneNumber = null;

  if (!state.creds.registered) {
    console.log(chalk.yellow.bold("\nEntrez votre numéro WhatsApp (ex: 2376XXXXXXXX)"));
    phoneNumber = await askQuestion("Numéro: ");
    const number = phoneNumber.replace(/[^0-9]/g, "");
    if (!number || number.length < 10) { logger.error("Numéro invalide!"); process.exit(1); }
    await new Promise(r => setTimeout(r, 3000));
    try {
      const pairingCode = await sock.requestPairingCode(number);
      logger.info("Code: " + pairingCode);
      console.log(chalk.greenBright("\n╔═══════════════════════════════════╗"));
      console.log(chalk.greenBright("║  📱 CODE: ") + chalk.yellowBright.bold(pairingCode) + chalk.greenBright("          ║"));
      console.log(chalk.greenBright("╚═══════════════════════════════════╝"));
    } catch (err) { console.log(chalk.red("❌ Erreur: " + err.message)); process.exit(1); }
  } else {
    console.log(chalk.green.bold("Session existante. Connexion..."));
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log(chalk.greenBright("✅ Connecté!"));
      afficherBanner();
      reconnectCount = 0;
      const ownerBare = getBareNumber(sock.user?.id);
      const ownerLid = sock.user?.lid ? getBareNumber(sock.user.lid) : null;
      global.owners = [ownerBare]; if (ownerLid && ownerLid !== ownerBare) global.owners.push(ownerLid);
      setOwner(sock.user);
      await loadCommands();
      const nowTs = Date.now();
      if (nowTs - lastWelcomeTime > 300000) {
        lastWelcomeTime = nowTs;
        try {
          const welcomeImage = "https://files.catbox.moe/gif51b.jpg"; // URL image du bot
          const welcomeCaption = `🚀 *SIGMA MDX DEPLOY ACTIF*

✨ Connexion reussie !

📊 *INFORMATIONS*
🔹 Mode: ${global.isPrefixMode ? "Prefix" : "No-Prefix"}
🔹 Commandes: ${Object.keys(global.commands).length}

💡 *UTILISATION*
Tapez .menu

👨‍💻 *MUZAN SIGMA*
📞 +32 491 942 744

📢 Rejoins la chaine officielle :
👉 https://whatsapp.com/channel/0029VbBIAP58KMqoJluW8r06

Merci d'avoir choisi SIGMA MDX ! 🌌`;
          const ownerJid = normalizeJid(global.owners[0] + "@s.whatsapp.net");
          await sock.sendMessage(ownerJid, { 
            image: { url: welcomeImage },
            caption: welcomeCaption,
            contextInfo: getContextInfo(sock.user?.id) 
          });
        } catch (e) {}
      }
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(chalk.red("Déconnecté. Raison: " + reason));
      if (reason !== DisconnectReason.loggedOut) {
        reconnectCount++;
        if (reconnectCount > 10) { logger.warn("Trop de reconnexions."); return; }
        const delay = Math.min(config.RECONNECT_DELAY * Math.pow(1.5, reconnectCount - 1), 60000);
        logger.info(`Reconnexion ${reconnectCount}/10 dans ${Math.round(delay/1000)}s`);
        setTimeout(startBot, delay);
      } else {
        await fs.remove(config.DOSSIER_AUTH);
        setTimeout(startBot, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    const msg = messages?.[0]; if (!msg?.message) return;
    const from = msg.key.remoteJid; 
    const sender = msg.key.fromMe ? sock.user?.id : (msg.key.participant || from);
    const senderNum = getBareNumber(sender);
    const text = pickText(unwrapMessage(msg.message)); 
    
      // DEBUG logs removed
    
    if (!text) return;

    const isOwner = global.owners?.includes(senderNum) || !!msg.key.fromMe || senderNum === config.SUPER_OWNER;
    const isSudo = loadSudo().includes(senderNum);
    
    if (!isOwner && !isSudo) {
      return;
    }

    let cmdName = null; 
    let args = [];
    
    if (global.isPrefixMode) {
      if (!text.startsWith(config.PREFIXE_COMMANDE)) {
        return;
      }
      args = text.slice(config.PREFIXE_COMMANDE.length).trim().split(/ +/);
      cmdName = args.shift()?.toLowerCase();
    } else {
      args = text.trim().split(/ +/);
      cmdName = args.shift()?.toLowerCase();
      if (cmdName?.startsWith(config.PREFIXE_COMMANDE)) return;
    }

    const cmd = global.commands[cmdName]; 
    if (!cmd) {
      return;
    }
    
    if (cmd.ownerOnly && !isOwner) { 
      await sock.sendMessage(from, { text: "Owner only.", contextInfo: getContextInfo(sock.user?.id) }); 
      return; 
    }
    
    // Exécution rapide - react en parallèle
    const reactPromise = sock.sendMessage(from, { react: { text: "🎯", key: msg.key } }).catch(() => {});
    
    try { 
      const botContext = { sessionPath: null };
      await cmd.execute(sock, msg, args, from, botContext); 
    } catch (err) {
      console.error(`Erreur ${cmdName}:`, err.message);
      try { 
        await sock.sendMessage(from, { text: `❌ Erreur: ${err.message}`, contextInfo: getContextInfo(sock.user?.id) }, { quoted: msg }); 
      } catch {}
    }
  });
}

// =================== DÉMARRAGE ===================
startBot();

process.on("unhandledRejection", (r) => logger.error("Rejection:", r));
process.on("uncaughtException", (e) => logger.error("Exception:", e));
