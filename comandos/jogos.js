// ==========================
// JOGOS.JS - DYNASTY ES
// ==========================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const caminhoJogos = path.join(__dirname, "./jogos.json");

// ===== Funções de JSON =====
function carregarJogos() {
    if (!fs.existsSync(caminhoJogos)) {
        fs.writeFileSync(caminhoJogos, JSON.stringify({ dias: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(caminhoJogos));
}

function salvarJogos(dados) {
    fs.writeFileSync(caminhoJogos, JSON.stringify(dados, null, 2));
}

// ===== Comandos =====
module.exports = {
    nome: "jogos",
    descricao: "Comandos de jogos do Dynasty ES.",

    async jogos(message) {
        const dados = carregarJogos();
        const hoje = new Date();
        const diasSemana = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
        const diaAtual = diasSemana[hoje.getDay()];

        const jogosDia = dados.dias.find(d => d.dia.toLowerCase() === diaAtual);
        if (!jogosDia || !jogosDia.jogos.length)
            return message.reply(`❌ Não há jogos cadastrados para hoje (${diaAtual}).`);

        const embed = new EmbedBuilder()
            .setTitle(`📅 Jogos de Hoje - ${jogosDia.dia}`)
            .setColor("#7d00ff")
            .setDescription(jogosDia.jogos.map(j => {
                let resultado = j.resultado || "❔";
                return `**Adversário:** ${j.adversario}\n**Rodada:** ${j.rodada}\n**Campeonato:** ${j.campeonato}\n**Data/Horário:** ${j.data} - ${j.horario}\n**Resultado:** ${resultado}`;
            }).join("\n\n"))
            .setFooter({ text: "Dynasty ES 💜" });

        message.channel.send({ embeds: [embed] });
    },

    async jogossem(message) {
        const dados = carregarJogos();
        if (!dados.dias.length) return message.reply("❌ Nenhum jogo cadastrado na semana.");

        const embed = new EmbedBuilder()
            .setTitle("📆 Jogos da Semana - Dynasty ES")
            .setColor("#7d00ff");

        let descricao = "";
        for (const dia of dados.dias) {
            descricao += `**${dia.dia}**\n`;
            descricao += dia.jogos.map(j => {
                let resultado = j.resultado || "❔";
                return `• ${j.adversario} | ${j.rodada} | ${j.campeonato} | ${j.data} - ${j.horario} | ${resultado}`;
            }).join("\n");
            descricao += "\n\n";
        }

        embed.setDescription(descricao.trim());
        message.channel.send({ embeds: [embed] });
    },

    async jogo(message, args) {
        if (!args.length) return message.reply("❌ Use: `!jogo <dia>` (segunda, terça, quinta).");
        const diaInput = args[0].toLowerCase();

        const diasAceitos = ["segunda", "segunda-feira", "terca", "terça", "terça-feira", "quinta", "quinta-feira"];
        if (!diasAceitos.includes(diaInput)) return message.reply("❌ Dia inválido. Use segunda, terça ou quinta.");

        const dados = carregarJogos();
        const jogosDia = dados.dias.find(d => d.dia.toLowerCase().includes(diaInput));
        if (!jogosDia || !jogosDia.jogos.length) return message.reply(`❌ Nenhum jogo cadastrado para ${args[0]}.`);

        const embed = new EmbedBuilder()
            .setTitle(`📅 Jogos - ${jogosDia.dia}`)
            .setColor("#7d00ff")
            .setDescription(jogosDia.jogos.map(j => {
                let resultado = j.resultado || "❔";
                return `**Adversário:** ${j.adversario} | **Rodada:** ${j.rodada} | **Campeonato:** ${j.campeonato} | ${j.data} - ${j.horario} | ${resultado}`;
            }).join("\n\n"))
            .setFooter({ text: "Dynasty ES 💜" });

        message.channel.send({ embeds: [embed] });
    },

    async addresult(message, args) {
        if (args.length < 3) return message.reply("❌ Use: `!addresult <adversário> | <placar> | <vit/der/emp>`");
        const [adversario, placar, tipo] = args.join(" ").split("|").map(p => p.trim());

        const dados = carregarJogos();
        let encontrado = false;

        for (const dia of dados.dias) {
            for (const jogo of dia.jogos) {
                if (jogo.adversario.toLowerCase() === adversario.toLowerCase()) {
                    let emoji = tipo === "vit" ? "✅" : tipo === "der" ? "❌" : tipo === "emp" ? "⚖️" : "";
                    jogo.resultado = `${placar} ${emoji}`;
                    encontrado = true;
                    break;
                }
            }
        }

        if (!encontrado) return message.reply("❌ Jogo não encontrado.");
        salvarJogos(dados);
        message.reply(`✅ Resultado de **${adversario}** atualizado!`);
    },

    async editarjogo(message, args) {
        if (args.length < 3) return message.reply("❌ Use: `!editarjogo <adversário> | <campo> | <novo valor>`");
        const [adversario, campo, ...valorArr] = args.join(" ").split("|").map(p => p.trim());
        const valor = valorArr.join(" ");

        const dados = carregarJogos();
        let encontrado = false;

        for (const dia of dados.dias) {
            for (const jogo of dia.jogos) {
                if (jogo.adversario.toLowerCase() === adversario.toLowerCase()) {
                    if (jogo[campo] !== undefined) {
                        jogo[campo] = valor;
                        encontrado = true;
                        break;
                    }
                }
            }
        }

        if (!encontrado) return message.reply("❌ Jogo não encontrado ou campo inválido.");
        salvarJogos(dados);
        message.reply(`✅ Jogo de **${adversario}** atualizado!`);
    },

    // ======= NOVO COMANDO =======
    async modificarjogos(message, args) {
        if (args.length < 4)
            return message.reply("❌ Use: `!modificarjogos <adv1> | <adv2> | <campo> | <novo valor>`");

        const partes = args.join(" ").split("|").map(p => p.trim());
        const campo = partes[partes.length - 2];
        const novoValor = partes[partes.length - 1];
        const adversarios = partes.slice(0, partes.length - 2);

        const dados = carregarJogos();
        let alterados = 0;

        for (const dia of dados.dias) {
            for (const jogo of dia.jogos) {
                if (adversarios.some(a => a.toLowerCase() === jogo.adversario.toLowerCase())) {
                    if (jogo[campo] !== undefined) {
                        jogo[campo] = novoValor;
                        alterados++;
                    }
                }
            }
        }

        if (alterados === 0) return message.reply("❌ Nenhum jogo correspondente encontrado ou campo inválido.");
        salvarJogos(dados);
        message.reply(`✅ Campo **${campo}** atualizado para **${alterados}** jogos.`);
    },

    async limparjogos(message) {
        salvarJogos({ dias: [] });
        message.reply("🧹 Todos os jogos da semana foram removidos!");
    },

    async addjogos(message, args) {
        const conteudo = args.join(" ").split("|").map(p => p.trim());
        if (conteudo.length < 6) return message.reply("❌ Formato: `!addjogos <dia> | <rodada> | <data> | <adversário> | <campeonato> | <horário>`");

        const [dia, rodada, data, adversario, campeonato, horario] = conteudo;

        const dados = carregarJogos();
        let diaExistente = dados.dias.find(d => d.dia.toLowerCase() === dia.toLowerCase());
        if (!diaExistente) {
            diaExistente = { dia, jogos: [] };
            dados.dias.push(diaExistente);
        }

        diaExistente.jogos.push({
            rodada: Number(rodada),
            data,
            adversario,
            campeonato,
            horario,
            resultado: null
        });

        salvarJogos(dados);
        message.reply(`✅ Jogo **${adversario}** adicionado em **${dia}**!`);
    },

    async removerjogo(message, args) {
        if (!args.length) return message.reply("❌ Use: `!removerjogo <adversário> | <dia (opcional)>`");

        const dados = carregarJogos();
        const conteudo = args.join(" ").split("|").map(p => p.trim());
        const adversario = conteudo[0];
        const diaFiltro = conteudo[1]?.toLowerCase();

        let encontrado = false;

        for (const dia of dados.dias) {
            if (diaFiltro && dia.dia.toLowerCase() !== diaFiltro) continue;
            const indexJogo = dia.jogos.findIndex(j => j.adversario.toLowerCase() === adversario.toLowerCase());
            if (indexJogo !== -1) {
                dia.jogos.splice(indexJogo, 1);
                encontrado = true;
                break;
            }
        }

        if (!encontrado) return message.reply("❌ Jogo não encontrado.");
        salvarJogos(dados);
        message.reply(`✅ Jogo de **${adversario}** removido!`);
    }
};