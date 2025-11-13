// ==========================
// INDEX.JS - DYNASTY ES (Render-friendly)
// ==========================

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");

const admin = require("./comandos/admin.js");
const notas = require("./comandos/notas.js");
const jogos = require("./comandos/jogos.js");

const prefix = "!";

// ================= CONFIG ALERTA =================
const ALERT_CHANNEL_ID = "1438189657954189503"; // substitui pelo ID do canal que vai receber alerta
const TEMPO_LIMITE = 10 * 60 * 1000; // 10 minutos sem ping
let ultimoPing = null;

// ====== MINI SERVIDOR (mantém o bot on) ======
const app = express();

app.get("/", (req, res) => {
  ultimoPing = new Date();
  console.log(`⚡ Ping recebido às ${ultimoPing.toLocaleTimeString()} - URL: ${req.url}`);
  res.send("✅ Dynasty ES está online!");
});

const PORT = process.env.PORT || 3000;
const urlPublica = process.env.PUBLIC_URL || "https://dyn-bot.onrender.com"; // colocar URL do Render no env

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 URL pública (Uptime/AutoPing): ${urlPublica}`);
});

// ===== AUTO-PING ======
setInterval(() => {
  try {
    https.get(urlPublica, (res) => {
      console.log(`🔄 Ping enviado - Status: ${res.statusCode} - ${new Date().toLocaleTimeString()}`);
    }).on("error", (err) => {
      console.error("❌ Erro ao pingar URL:", err);
    });
  } catch (e) {
    console.error("❌ Erro no setInterval do ping:", e);
  }
}, 5 * 60 * 1000);

// ====== CONFIG DO BOT ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ====== READY ======
client.once("ready", () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  client.user.setActivity("Dynasty ES ⚽", { type: 0 });
});

// ===== ALERTA DE INATIVIDADE ======
setInterval(() => {
  if (!ultimoPing) return;
  const agora = new Date();
  const diff = agora - ultimoPing;

  if (diff > TEMPO_LIMITE) {
    console.log(`⚠️ Último ping foi há mais de ${TEMPO_LIMITE/60000} minutos!`);
    const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (canal) {
      canal.send(`⚠️ Atenção! Bot pode estar offline! Último ping recebido há mais de ${TEMPO_LIMITE/60000} minutos.`);
    }
  } else {
    console.log(`✅ Ping ok - último recebido há ${Math.floor(diff/1000)}s`);
  }
}, 1 * 60 * 1000);

// ===== util pra ler comandos custom com validação =====
function getComandoCustom(command) {
  const comandosCustomFile = path.join(__dirname, "comandosCustom.json");
  if (!fs.existsSync(comandosCustomFile)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(comandosCustomFile, "utf8"));
    if (!data.comandosCustom || !Array.isArray(data.comandosCustom)) return null;
    return data.comandosCustom.find(c => (c.nome || "").toLowerCase() === command);
  } catch (e) {
    console.error("❌ Erro ao ler comandosCustom.json:", e);
    return null;
  }
}

// ====== EVENTO PRINCIPAL ======
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();

    // ================= ADMIN + MOD =================
    const adminComandos = [
      "ban", "kick", "mute", "desmute", "limpar",
      "say", "sayembed", "anunciar", "regras",
      "addcomando", "remcomando", "removercomando"
    ];

    if (adminComandos.includes(command)) {
      try {
        await admin.executar(message.member, message, [command, ...args]);
      } catch (err) {
        console.error(`❌ Erro no comando admin (${command}):`, err);
        message.reply("❌ Erro ao executar esse comando.");
      }
      return;
    }

    // ================= SISTEMA DE NOTAS =================
    const notasComandos = [
      "notas", "notastabela", "vernota", "top",
      "addjogador", "remjogador", "removerjogador",
      "setpos", "setstatus", "avaliar", "retirarnota", "retnota", "zerarnotas", "addnota"
    ];

    if (notasComandos.includes(command)) {
      try {
        await notas.executar(message, [command, ...args]);
      } catch (err) {
        console.error(`❌ Erro no comando notas (${command}):`, err);
        message.reply("❌ Erro ao executar comando de notas.");
      }
      return;
    }

    // ================= COMANDOS DE JOGOS =================
    const jogosComandos = [
      "jogos", "jogossem", "jogo", "addresult",
      "editarjogo", "modificarjogos", "limparjogos",
      "addjogos", "removerjogo"
    ];

    if (jogosComandos.includes(command)) {
      try {
        if (command === "jogos") await jogos.jogos(message);
        else if (command === "jogossem") await jogos.jogossem(message);
        else if (command === "jogo") await jogos.jogo(message, args);
        else if (command === "addresult") await jogos.addresult(message, args);
        else if (command === "editarjogo") await jogos.editarjogo(message, args);
        else if (command === "modificarjogos") await jogos.modificarjogos(message, args);
        else if (command === "limparjogos") await jogos.limparjogos(message);
        else if (command === "addjogos") await jogos.addjogos(message, args);
        else if (command === "removerjogo") await jogos.removerjogo(message, args);
      } catch (err) {
        console.error(`❌ Erro no comando jogos (${command}):`, err);
        message.reply("❌ Erro ao executar comando de jogos.");
      }
      return;
    }

    // ================= COMANDOS GERAIS =================
    if (command === "ping") {
      message.delete().catch(() => {});
      return message.channel.send("✅ To online e funcionando!");
    }

    if (command === "serverinfo") {
      return message.reply(
        `📊 Servidor: **${message.guild.name}**\n👥 Membros: **${message.guild.memberCount}**\n🆔 ID: ${message.guild.id}`
      );
    }

    if (command === "userinfo") {
      const user = message.mentions.users.first() || message.author;
      return message.reply(
        `👤 Usuário: **${user.username}**\n🆔 ID: ${user.id}\n📅 Criado em: ${user.createdAt.toLocaleDateString()}`
      );
    }

    // ================= COMANDOS CUSTOM =================
    const cmdCustom = getComandoCustom(command);
    if (cmdCustom) {
      message.delete().catch(() => {});
      return message.channel.send(cmdCustom.resposta);
    }

    // ================= COMANDOS: !COMANDOS (embed) =================
    if (command === "comandos") {
      message.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle("📜 Lista de Comandos do Bot")
        .setColor("#7d00ff")
        .setDescription("🛠️ Comandos Gerais...\n📋 Sistema de Notas...\n⚽ Jogos...\n🛡️ Mod/Admin...")
        .setFooter({ text: "Dynasty ES • Feito por Razerxz" });

      return message.channel.send({ embeds: [embed] });
    }

  } catch (err) {
    console.error("❌ Erro no messageCreate (index):", err);
    try { message.reply("❌ Ocorreu um erro interno."); } catch(e){}
  }
});

// ====== LOGIN ======
console.log("🔑 Tentando logar no bot...");
client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Falha ao logar no Discord:", err);
});