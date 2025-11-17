// ==========================
// INDEX.JS - DYNASTY ES (Auto LBE + Sistema de Notas + Admin + Auto Deploy)
// ==========================

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");

// ==== IMPORT DOS COMANDOS ====
const admin = require("./comandos/admin.js");
const notas = require("./comandos/notas.js");
const jogos = require("./comandos/jogos.js");      // Comandos manuais
const jogosLBE = require("./comandos/jogoslbe.js"); // Fetch LBE

const prefix = "!";

// ================= CONFIG ALERTA =================
const ALERT_CHANNEL_ID = "1438189657954189503"; 
const TEMPO_LIMITE = 10 * 60 * 1000; // 10 minutos sem ping
let ultimoPing = null;

// ====== MINI SERVIDOR (Render) ======
const app = express();

app.get("/", (req, res) => {
  ultimoPing = new Date();
  console.log(`⚡ Ping recebido às ${ultimoPing.toLocaleTimeString()} - URL: ${req.url}`);
  res.send("✅ Dynasty ES está online!");
});

const PORT = process.env.PORT || 3000;
const urlPublica = process.env.PUBLIC_URL || null;

// ===== CONFIG DO CLIENT (BOT) =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let clientReady = false;

client.once("ready", () => {
  clientReady = true;
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  client.user.setActivity("Dynasty ES ⚽", { type: 0 });
});

// ===== ALERTA OFFLINE =====
let alertaEnviado = false;
setInterval(() => {
  if (!ultimoPing) return;
  const diff = new Date() - ultimoPing;

  if (diff > TEMPO_LIMITE && !alertaEnviado) {
    const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (canal) canal.send("⚠️ O bot pode ter ficado offline! Render sem ping!");
    alertaEnviado = true;
  } else if (diff <= TEMPO_LIMITE) {
    alertaEnviado = false;
  }
}, 60 * 1000);

// ===== AUTO-PING ======
if (urlPublica) {
  setInterval(() => {
    try {
      https.get(urlPublica, (res) => {
        console.log(`🔄 Ping enviado - Status: ${res.statusCode} - ${new Date().toLocaleTimeString()}`);
      }).on("error", (err) => {
        console.error("❌ Erro ao pingar URL:", err);
      });
    } catch (e) {
      console.error("❌ Erro no ping automático:", e);
    }
  }, 5 * 60 * 1000);
}

// ====== COMANDOS CUSTOM ======
function getComandoCustom(command) {
  const file = path.join(__dirname, "comandosCustom.json");
  if (!fs.existsSync(file)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(data.comandosCustom)) return null;
    return data.comandosCustom.find(c => (c.nome || "").toLowerCase() === command);
  } catch {
    return null;
  }
}

// ====== EVENTO PRINCIPAL ======
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();

    // ========== ADMIN ==========
    const adminComandos = [
      "ban","kick","mute","desmute","limpar","say","sayembed",
      "anunciar","regras","addcomando","remcomando","removercomando"
    ];
    if (adminComandos.includes(command))
      return admin.executar(message.member, message, [command, ...args]);

    // ========== NOTAS ==========
    const notasComandos = [
      "notas","notastabela","vernota","top","addjogador","remjogador",
      "removerjogador","setpos","setstatus","avaliar","retirarnota",
      "retnota","zerarnotas","addnota","reorganizar"
    ];
    if (notasComandos.includes(command))
      return notas.executar(message, [command, ...args]);

    // ========== JOGOS MANUAIS ==========
    const jogosManuais = [
      "addresult","editarjogo","modificarjogos","limparjogos",
      "addjogos","removerjogo"
    ];
    if (jogosManuais.includes(command)) {
      if (typeof jogos[command] === "function") return jogos[command](message, args);
      else return message.reply("❌ Comando manual de jogos não encontrado.");
    }

    // ========== JOGOS LBE ==========
    const jogosLBEComandos = [
      "jogos","jogossem","jogosprox","updatejogos"
    ];
    if (jogosLBEComandos.includes(command)) {
      if (typeof jogosLBE[command] === "function") return jogosLBE[command](message, args);
      else return message.reply("❌ Comando LBE não encontrado.");
    }

    // ========== COMANDOS GERAIS ==========
    if (command === "ping") return message.channel.send("✅ To Online e Funcionando Cria");
    if (command === "serverinfo")
      return message.reply(`📊 Servidor: **${message.guild.name}**\n👥 Membros: **${message.guild.memberCount}**`);
    
    if (command === "userinfo") {
      const user = message.mentions.users.first() || message.author;
      return message.reply(`👤 Usuário: **${user.username}**\n🆔 ID: ${user.id}`);
    }

    // ========== CUSTOM ==========
    const cmdCustom = getComandoCustom(command);
    if (cmdCustom) return message.channel.send(cmdCustom.resposta);

    // ========== LISTA DE COMANDOS ==========
    if (command === "comandos") {
      const embed = new EmbedBuilder()
        .setTitle("📜 Comandos do Bot")
        .setColor("#7d00ff")
        .setDescription(`
🛠️ Gerais  
• ping • serverinfo • userinfo  

📝 Notas  
• notas • vernota • top • avaliar  
• addjogador • remjogador  
• setpos • setstatus • zerarnotas  
• reorganizar

⚽ Jogos  
• jogos (auto LBE)  
• jogossem  
• jogosprox  
• addresult • editarjogo  
• modificarjogos  
• limparjogos  
• addjogos • removerjogo  
• updatejogos

🛡 Admin  
• ban • kick • mute • desmute  
• say • sayembed • anunciar  
• regras • addcomando • removercomando
        `)
        .setFooter({ text: "Dynasty ES • Bot Oficial" });

      return message.channel.send({ embeds: [embed] });
    }

  } catch (err) {
    console.error("❌ ERRO messageCreate:", err);
    message.reply("❌ Erro interno.").catch(() => {});
  }
});

// ====== GITHUB WEBHOOK (Auto deploy) ======
app.post("/github-deploy", express.json(), (req, res) => {
  try {
    if (!clientReady) return res.status(503).send("Bot ainda não conectado");
    const body = req.body;
    if (!body.commits || !body.commits.length) return res.sendStatus(200);

    const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (!canal) return res.status(500).send("Canal não encontrado");

    const mensagem = body.commits.map(c => `• ${c.id.substring(0,7)}: ${c.message}`).join("\n");
    canal.send(`🚀 Novo deploy recebido:\n${mensagem}`);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro webhook GitHub:", err);
    return res.sendStatus(500);
  }
});

// ===== LOGIN =====
console.log("🔑 Logando bot...");
client.login(process.env.TOKEN).catch(err =>
  console.error("❌ Falha ao logar:", err)
);

// ===== START SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  if (urlPublica) console.log(`🌐 URL pública (Uptime): ${urlPublica}`);
});