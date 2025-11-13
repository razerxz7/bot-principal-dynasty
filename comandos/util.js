const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    comandos: [
        {
            nome: "say",
            descricao: "Faz o bot repetir uma mensagem.",
            async executar(message, args) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return message.reply("❌ Tu não tem permissão pra usar esse comando, irmão.");
                }

                const texto = args.join(" ");
                if (!texto) return message.reply("⚠️ Digita o que eu devo falar, pô!");

                await message.delete().catch(() => {});
                message.channel.send(texto);
            }
        },
        {
            nome: "sayembed",
            descricao: "Manda uma mensagem em embed.",
            async executar(message, args) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return message.reply("❌ Tu não tem permissão pra usar esse comando, fiote.");
                }

                const texto = args.join(" ");
                if (!texto) return message.reply("⚠️ Manda o texto da embed, po.");

                const embed = new EmbedBuilder()
                    .setColor("#7d00ff")
                    .setDescription(texto)
                    .setFooter({ text: `Mensagem enviada por ${message.author.username}` });

                await message.delete().catch(() => {});
                message.channel.send({ embeds: [embed] });
            }
        },
        {
            nome: "anunciar",
            descricao: "Cria um anúncio estiloso com título e descrição.",
            async executar(message, args) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    return message.reply("❌ Tu não tem permissão pra anunciar, parça.");
                }

                const [titulo, ...resto] = args.join(" ").split("|");
                if (!titulo || !resto.length) {
                    return message.reply("⚠️ Usa assim: `!anunciar Título | descrição da mensagem`");
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📢 ${titulo.trim()}`)
                    .setColor("#7d00ff")
                    .setDescription(resto.join("|").trim())
                    .setFooter({ text: "Dynasty ES 💜 Anúncio oficial" });

                await message.delete().catch(() => {});
                message.channel.send({ embeds: [embed] });
            }
        },
        {
            nome: "regras",
            descricao: "Mostra as regras do Dynasty ES.",
            async executar(message) {
                const embed = new EmbedBuilder()
                    .setTitle("📜 Regras do Dynasty ES")
                    .setColor("#7d00ff")
                    .setDescription(
`**Pontualidade:** Será tolerado sem punição até 5 minutos após o horário previsto pra estarem no lobby.

**Disponibilidade:** Corujão é treino pra gente! Se faltar será descontado nos pontos. Pontos corridos, mesmo com bom motivo, ainda descontam — só que menos.

**Respeito na call:** Discutiu, não ouviu call ou deixou de passar call = desconto nos pontos.

**Builds corretas:** Um dos critérios que mais desconta pontos. O nome já diz tudo!

**Gameplay:** Avaliada com base no desempenho pós-jogo e análise dos adms. Pode ser positiva ou negativa.`
                    )
                    .setFooter({ text: "Dynasty ES 💜 Organização e respeito acima de tudo" });

                message.channel.send({ embeds: [embed] });
            }
        }
    ]
};