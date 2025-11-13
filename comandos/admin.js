// ==========================
// ADMIN.JS - DYNASTY ES ⚡
// ==========================

const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");

const comandosFile = path.join(__dirname, "comandosData.json");

function carregarComandos() {
  if (!fs.existsSync(comandosFile))
    fs.writeFileSync(comandosFile, JSON.stringify({ comandos: [] }, null, 2));
  return JSON.parse(fs.readFileSync(comandosFile));
}

function salvarComandos(dados) {
  fs.writeFileSync(comandosFile, JSON.stringify(dados, null, 2));
}

module.exports.executar = async (member, message, args) => {
  const cmd = args[0]?.toLowerCase();
  const subArgs = args.slice(1);

  // ====== SOMENTE ADMIN ======
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription("🚫 Tu não tem permissão pra usar esse comando, irmão.");
    const msg = await message.reply({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return;
  }

  if (!cmd) return message.reply("❌ Comando admin inválido.");

  try {
    switch (cmd) {
      case "regras": {
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
          .setTitle("📜 Regras do Dynasty ES")
          .setColor("#7d00ff")
          .setDescription(
`**⏰ Pontualidade:** Tolerância de até 5 minutos após o horário.
**🔔 Disponibilidade:** Corujão é treino, faltas = desconto nos pontos.
**🎧 Respeito na call:** Discussões ou falta de call = desconto.
**⚙️ Builds corretas:** Errou a build? Desconto pesado.
**⚽ Gameplay:** Avaliado por desempenho + análise dos adms.`
          )
          .setFooter({ text: "Dynasty ES - Organização e respeito acima de tudo 💜" });
        return message.channel.send({ embeds: [embed] });
      }

      case "say": {
        if (!subArgs.length) return message.reply("❌ Use: !say <mensagem>");
        await message.delete().catch(() => {});
        const msg = await message.channel.send(subArgs.join(" "));
        setTimeout(() => msg.delete().catch(() => {}), 10000);
        break;
      }

      case "sayembed": {
        if (!subArgs.length) return message.reply("❌ Use: !sayembed <mensagem>");
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
          .setDescription(subArgs.join(" "))
          .setColor("#7d00ff");
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
        break;
      }

      case "anunciar": {
        if (!subArgs.length) return message.reply("❌ Use: !anunciar <mensagem>");
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
          .setTitle("📢 Anúncio do Dynasty ES")
          .setDescription(subArgs.join(" "))
          .setColor("#7d00ff");
        return message.channel.send({ embeds: [embed] });
      }

      case "ban": {
        await message.delete().catch(() => {});
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Mencione alguém pra banir.");
        if (!user.bannable) return message.reply("❌ Não posso banir esse usuário (hierarquia ou permissão).");

        await user.ban({ reason: `Banido por ${message.author.tag}` }).catch(() => message.reply("❌ Não deu pra banir."));
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(`⛔ ${user.user.tag} foi **banido**.`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "kick": {
        await message.delete().catch(() => {});
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Mencione alguém pra expulsar.");
        if (!user.kickable) return message.reply("❌ Não posso expulsar esse usuário (hierarquia ou permissão).");

        await user.kick({ reason: `Expulso por ${message.author.tag}` }).catch(() => message.reply("❌ Não deu pra expulsar."));
        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setDescription(`👢 ${user.user.tag} foi **expulso**.`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "mute": {
        await message.delete().catch(() => {});
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Mencione alguém pra mutar.");
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (!muteRole) return message.reply("❌ Cargo 'Muted' não encontrado.");
        if (user.roles.cache.has(muteRole.id)) return message.reply("❌ Usuário já está mutado.");

        await user.roles.add(muteRole).catch(() => message.reply("❌ Não deu pra mutar."));
        const embed = new EmbedBuilder()
          .setColor("#7d00ff")
          .setDescription(`🔇 ${user.user.tag} foi **mutado**.`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "desmute": {
        await message.delete().catch(() => {});
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Mencione alguém pra desmutar.");
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (!muteRole) return message.reply("❌ Cargo 'Muted' não encontrado.");
        if (!user.roles.cache.has(muteRole.id)) return message.reply("❌ Usuário não está mutado.");

        await user.roles.remove(muteRole).catch(() => message.reply("❌ Não deu pra desmutar."));
        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(`🔊 ${user.user.tag} foi **desmutado**.`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "limpar": {
        const qtd = parseInt(subArgs[0]);
        if (!qtd || isNaN(qtd)) return message.reply("❌ Use: !limpar <quantidade>");
        if (qtd > 1000) return message.reply("⚠️ Máximo permitido: **1000 mensagens**.");

        await message.delete().catch(() => {});
        let deletadas = 0;

        while (deletadas < qtd) {
          const restante = qtd - deletadas;
          const batchSize = Math.min(restante, 100);
          const fetched = await message.channel.messages.fetch({ limit: batchSize });
          if (fetched.size === 0) break;
          await message.channel.bulkDelete(fetched, true).catch(() => {});
          deletadas += fetched.size;
        }

        const embed = new EmbedBuilder()
          .setColor("#7d00ff")
          .setDescription(`🧹 Foram removidas **${deletadas}** mensagens com sucesso!`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "addcomando": {
        await message.delete().catch(() => {});
        if (subArgs.length < 2) return message.reply("❌ Use: !addcomando <nome> <resposta>");
        const dados = carregarComandos();
        const nome = subArgs[0].toLowerCase();
        const resposta = subArgs.slice(1).join(" ");
        if (dados.comandos.find(c => c.nome === nome))
          return message.reply("❌ Esse comando já existe.");
        dados.comandos.push({ nome, resposta });
        salvarComandos(dados);
        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(`✅ Comando **${nome}** adicionado com sucesso!`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "remcomando":
      case "removercomando": {
        await message.delete().catch(() => {});
        if (!subArgs[0]) return message.reply("❌ Use: !remcomando <nome>");
        const dados = carregarComandos();
        const nome = subArgs[0].toLowerCase();
        const index = dados.comandos.findIndex(c => c.nome === nome);
        if (index === -1) return message.reply("❌ Comando não encontrado.");
        dados.comandos.splice(index, 1);
        salvarComandos(dados);
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(`🗑️ Comando **${nome}** removido.`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      default: {
        const dados = carregarComandos();
        const cmdExtra = dados.comandos.find(c => c.nome === cmd);
        if (cmdExtra) return message.channel.send(cmdExtra.resposta);
        return message.reply("❌ Comando admin inválido.");
      }
    }
  } catch (err) {
    console.error(`Erro no comando admin (${cmd}):`, err);
    const msg = await message.reply("❌ Erro ao executar comando admin.");
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  }
};