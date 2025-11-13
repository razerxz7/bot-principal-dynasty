// ==========================
// ADMIN.JS - DYNASTY ES ⚡ (Versão corrigida)
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
    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return;
  }

  if (!cmd) return message.channel.send("❌ Comando admin inválido.");

  try {
    switch (cmd) {
      case "regras": {
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
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [embed] });
      }

      case "say": {
        if (!subArgs.length) return message.channel.send("❌ Use: !say <mensagem>");
        const msgEnviada = await message.channel.send(subArgs.join(" "));
        await message.delete().catch(() => {});
        setTimeout(() => msgEnviada.delete().catch(() => {}), 10000);
        break;
      }

      case "sayembed": {
        if (!subArgs.length) return message.channel.send("❌ Use: !sayembed <mensagem>");
        const embed = new EmbedBuilder()
          .setDescription(subArgs.join(" "))
          .setColor("#7d00ff");
        const msgEnviada = await message.channel.send({ embeds: [embed] });
        await message.delete().catch(() => {});
        setTimeout(() => msgEnviada.delete().catch(() => {}), 10000);
        break;
      }

      case "anunciar": {
        if (!subArgs.length) return message.channel.send("❌ Use: !anunciar <mensagem>");
        const embed = new EmbedBuilder()
          .setTitle("📢 Anúncio do Dynasty ES")
          .setDescription(subArgs.join(" "))
          .setColor("#7d00ff");
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [embed] });
      }

      case "ban": {
        const user = message.mentions.members.first();
        if (!user) return message.channel.send("❌ Mencione alguém pra banir.");
        if (!user.bannable) return message.channel.send("❌ Não posso banir esse usuário (hierarquia ou permissão).");

        await user.ban({ reason: `Banido por ${message.author.tag}` }).catch(() => message.channel.send("❌ Não deu pra banir."));
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription(`⛔ ${user.user.tag} foi **banido**.`);
        await message.delete().catch(() => {});
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "kick": {
        const user = message.mentions.members.first();
        if (!user) return message.channel.send("❌ Mencione alguém pra expulsar.");
        if (!user.kickable) return message.channel.send("❌ Não posso expulsar esse usuário (hierarquia ou permissão).");

        await user.kick({ reason: `Expulso por ${message.author.tag}` }).catch(() => message.channel.send("❌ Não deu pra expulsar."));
        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setDescription(`👢 ${user.user.tag} foi **expulso**.`);
        await message.delete().catch(() => {});
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "mute": {
        const user = message.mentions.members.first();
        if (!user) return message.channel.send("❌ Mencione alguém pra mutar.");
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (!muteRole) return message.channel.send("❌ Cargo 'Muted' não encontrado.");
        if (user.roles.cache.has(muteRole.id)) return message.channel.send("❌ Usuário já está mutado.");

        await user.roles.add(muteRole).catch(() => message.channel.send("❌ Não deu pra mutar."));
        const embed = new EmbedBuilder()
          .setColor("#7d00ff")
          .setDescription(`🔇 ${user.user.tag} foi **mutado**.`);
        await message.delete().catch(() => {});
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "desmute": {
        const user = message.mentions.members.first();
        if (!user) return message.channel.send("❌ Mencione alguém pra desmutar.");
        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (!muteRole) return message.channel.send("❌ Cargo 'Muted' não encontrado.");
        if (!user.roles.cache.has(muteRole.id)) return message.channel.send("❌ Usuário não está mutado.");

        await user.roles.remove(muteRole).catch(() => message.channel.send("❌ Não deu pra desmutar."));
        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(`🔊 ${user.user.tag} foi **desmutado**.`);
        await message.delete().catch(() => {});
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "limpar": {
        const qtd = parseInt(subArgs[0]);
        if (!qtd || isNaN(qtd)) return message.channel.send("❌ Use: !limpar <quantidade>");
        if (qtd > 1000) return message.channel.send("⚠️ Máximo permitido: **1000 mensagens**.");

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
        if (subArgs.length < 2) return message.channel.send("❌ Use: !addcomando <nome> <resposta>");
        const dados = carregarComandos();
        const nome = subArgs[0].toLowerCase();
        const resposta = subArgs.slice(1).join(" ");
        if (dados.comandos.find(c => c.nome === nome))
          return message.channel.send("❌ Esse comando já existe.");
        dados.comandos.push({ nome, resposta });
        salvarComandos(dados);
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(`✅ Comando **${nome}** adicionado com sucesso!`);
        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        break;
      }

      case "remcomando":
      case "removercomando": {
        if (!subArgs[0]) return message.channel.send("❌ Use: !remcomando <nome>");
        const dados = carregarComandos();
        const nome = subArgs[0].toLowerCase();
        const index = dados.comandos.findIndex(c => c.nome === nome);
        if (index === -1) return message.channel.send("❌ Comando não encontrado.");
        dados.comandos.splice(index, 1);
        salvarComandos(dados);
        await message.delete().catch(() => {});
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
        return message.channel.send("❌ Comando admin inválido.");
      }
    }
  } catch (err) {
    console.error(`Erro no comando admin (${cmd}):`, err);
    const msg = await message.channel.send("❌ Erro ao executar comando admin.");
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  }
};