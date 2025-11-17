const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const caminhoNotas = path.join(__dirname, "./notas.json");

function carregarNotas() {
    if (!fs.existsSync(caminhoNotas)) {
        fs.writeFileSync(caminhoNotas, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(caminhoNotas));
}

function salvarNotas(dados) {
    fs.writeFileSync(caminhoNotas, JSON.stringify(dados, null, 2));
}

// Mapeamento de emoji por posição (só pra exibição)
const emojiPos = {
    "ST": "⚽",
    "MC": "🎯",
    "ALA": "🏃",
    "ZAG": "🧱",
    "GK": "🧤",
    "Indefinido": "❔"
};

// Mapeamento de emoji de status (titular/reserva/disputa)
const emojiStatus = {
    "titular": "✅",
    "reserva": "❌",
    "disputa": "⚖️"
};

// Função pra organizar por posição principal (mantive sua lógica)
function organizarPorPosicao(dados) {
    const categorias = {
        "ST": [],
        "MC": [],
        "ALA": [],
        "ZAG": [],
        "GK": [],
        "Indefinido": []
    };

    for (const jogador of Object.keys(dados)) {
        const posPrincipal = dados[jogador].posicoes?.[0] || "Indefinido";
        if (categorias[posPrincipal]) {
            categorias[posPrincipal].push(jogador);
        } else {
            categorias["Indefinido"].push(jogador);
        }
    }
    return categorias;
}

module.exports = {
    async executar(message, args) {
        const comando = args.shift()?.toLowerCase();
        const dados = carregarNotas();

        // =================== !NOTAS ===================
        if (comando === "notas") {
            const categorias = organizarPorPosicao(dados);
            let descricao = "";

            for (const [pos, jogadores] of Object.entries(categorias)) {
                if (jogadores.length === 0) continue;

                const posEmoji = emojiPos[pos] || emojiPos["Indefinido"];
                descricao += `\n${posEmoji} **${pos}**\n`;

                for (const j of jogadores) {
                    const d = dados[j] || {};

                    // normaliza status pra exibir o emoji correto
                    const rawStatus = (d.status || "").toString().toLowerCase();
                    const statusKey = rawStatus.includes("tit") ? "titular"
                                     : rawStatus.includes("res") ? "reserva"
                                     : "disputa"; // default
                    const statusTxt = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
                    const statusEmoji = emojiStatus[statusKey] || emojiStatus["disputa"];

                    // exibe a posição principal com emoji (sem criar/alterar dados)
                    const posicoesTxt = d.posicoes
                        ? `${(emojiPos[d.posicoes[0]] || "❔")} ${d.posicoes[0]}${d.posicoes.length > 1 ? " (" + d.posicoes.slice(1).join("/") + ")" : ""}`
                        : "❔ Indefinido";

                    // monta a linha mantendo TODOS os campos que tu já tinha
                    const linha =
                        `${statusEmoji} **${j}** - ${statusTxt}\n` +
                        `Total: ${d.total ?? 0} | Pontualidade: ${d.pontualidade ?? 0} | Disponibilidade: ${d.disponibilidade ?? 0} | Respeito: ${d.respeito ?? 0} | Builds: ${d.builds ?? 0} | Gameplay: ${d.gameplay ?? 0} | Posição: ${posicoesTxt}\n`;

                    descricao += linha;
                }

                descricao += "----------------------\n";
            }

            const embed = new EmbedBuilder()
                .setTitle("📝 Notas dos Jogadores")
                .setColor("#7d00ff")
                .setDescription(descricao.trim() || "Nenhum jogador cadastrado.");

            return message.channel.send({ embeds: [embed] });
        }

        // =================== !NOTASTABELA ===================
        if (comando === "notastabela") {
            const texto = Object.keys(dados)
                .sort()
                .map(j => {
                    const d = dados[j];
                    const rawStatus = (d.status || "").toString().toLowerCase();
                    const statusKey = rawStatus.includes("tit") ? "titular"
                                     : rawStatus.includes("res") ? "reserva"
                                     : "disputa";
                    const statusEmojiTxt = emojiStatus[statusKey] || emojiStatus["disputa"];
                    const posicoesTxt = d.posicoes ? `${(emojiPos[d.posicoes[0]] || "❔")} ${d.posicoes[0]}` : "❔ Indefinido";
                    return `${statusEmojiTxt} **${j}** | Total: ${d.total ?? 0} | ${posicoesTxt}`;
                }).join("\n") || "Nenhum jogador cadastrado.";

            const embed = new EmbedBuilder()
                .setTitle("📊 Tabela de Notas")
                .setColor("#7d00ff")
                .setDescription(texto);

            return message.channel.send({ embeds: [embed] });
        }

        // =================== !VERNOTA ===================
        if (comando === "vernota") {
            const nome = args.join(" ");
            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");
            const d = dados[nome];

            const rawStatus = (d.status || "").toString().toLowerCase();
            const statusKey = rawStatus.includes("tit") ? "titular"
                             : rawStatus.includes("res") ? "reserva"
                             : "disputa";
            const statusEmojiTxt = emojiStatus[statusKey] || emojiStatus["disputa"];
            const statusTxt = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);

            const posicoesTxt = d.posicoes
                ? d.posicoes.map(p => `${(emojiPos[p] || "❔")} ${p}`).join(", ")
                : "❔ Indefinido";

            const embed = new EmbedBuilder()
                .setTitle(`📌 Notas de ${nome}`)
                .setColor("#7d00ff")
                .setDescription(
                    `Status: ${statusEmojiTxt} ${statusTxt}\n` +
                    `Total: ${d.total ?? 0}\n` +
                    `Pontualidade: ${d.pontualidade ?? 0}\n` +
                    `Disponibilidade: ${d.disponibilidade ?? 0}\n` +
                    `Respeito: ${d.respeito ?? 0}\n` +
                    `Builds: ${d.builds ?? 0}\n` +
                    `Gameplay: ${d.gameplay ?? 0}\n` +
                    `Posições: ${posicoesTxt}`
                );

            return message.channel.send({ embeds: [embed] });
        }

        // =================== !TOP ===================
        if (comando === "top") {
            const top = Object.keys(dados)
                .map(j => ({ nome: j, total: dados[j].total ?? 0, posicoes: dados[j].posicoes || ["Indefinido"], status: dados[j].status || "" }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            const texto = top.map((j, i) => {
                const rawStatus = (j.status || "").toString().toLowerCase();
                const statusKey = rawStatus.includes("tit") ? "titular"
                                 : rawStatus.includes("res") ? "reserva"
                                 : "disputa";
                const statusEmojiTxt = emojiStatus[statusKey] || emojiStatus["disputa"];
                const posTxt = `${(emojiPos[j.posicoes[0]] || "❔")} ${j.posicoes[0]}`;
                return `${i+1}. ${statusEmojiTxt} **${j.nome}** - ${j.total} pts | ${posTxt}`;
            }).join("\n") || "Nenhum jogador cadastrado.";

            const embed = new EmbedBuilder()
                .setTitle("🏆 Top 10 Jogadores")
                .setColor("#7d00ff")
                .setDescription(texto);

            return message.channel.send({ embeds: [embed] });
        }

        // =================== !ADDJOGADOR ===================
        if (comando === "addjogador") {
            const nome = args.join(" ");
            if (!nome) return message.reply("❌ Use: !addjogador <nome>");
            if (dados[nome]) return message.reply("❌ Jogador já existe.");
            dados[nome] = { pontualidade: 0, disponibilidade: 0, respeito: 0, builds: 0, gameplay: 0, total: 0, status: "disputa", posicoes: ["Indefinido"] };
            salvarNotas(dados);
            return message.reply(`✅ Jogador **${nome}** adicionado!`);
        }

        // =================== !REMJOGADOR / !REMOVERJOGADOR ===================
        if (["remjogador","removerjogador"].includes(comando)) {
            const nome = args.join(" ");
            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");
            delete dados[nome];
            salvarNotas(dados);
            return message.reply(`🗑️ Jogador **${nome}** removido!`);
        }

        // =================== !SETPOS ===================
        if (comando === "setpos") {
            const nome = args.shift();
            const posicoesInput = args.join(" ").toUpperCase().split("/").slice(0, 3);

            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");

            const posValidas = ["ST","MC","ALA","ZAG","GK"];
            const filtradas = posicoesInput.filter(p => posValidas.includes(p));
            if (filtradas.length === 0) return message.reply("❌ Nenhuma posição válida. Use: ST/MC/ALA/ZAG/GK");

            dados[nome].posicoes = filtradas;
            salvarNotas(dados);
            return message.reply(`✅ Posições de **${nome}** atualizadas para **${filtradas.join("/")}** (principal: ${filtradas[0]})`);
        }

        // =================== !SETSTATUS ===================
        if (comando === "setstatus") {
            const nome = args.shift();
            const statusInput = args.join(" ").toLowerCase();

            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");

            // normaliza entrada pra um dos três valores
            let status = "disputa";
            if (statusInput.includes("tit")) status = "titular";
            else if (statusInput.includes("res")) status = "reserva";

            dados[nome].status = status;
            salvarNotas(dados);
            return message.reply(`✅ Status de **${nome}** atualizado para **${emojiStatus[status]} ${status.charAt(0).toUpperCase() + status.slice(1)}**`);
        }

        // =================== !ADDNOTA ===================
        if (comando === "addnota") {
            const nome = args.shift();
            const categoria = args.shift();
            const valor = Number(args.shift());
            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");
            if (!["pontualidade","disponibilidade","respeito","builds","gameplay"].includes(categoria)) return message.reply("❌ Categoria inválida.");
            if (isNaN(valor)) return message.reply("❌ Valor inválido.");
            dados[nome][categoria] = valor;
            dados[nome].total = (dados[nome].pontualidade || 0) + (dados[nome].disponibilidade || 0) + (dados[nome].respeito || 0) + (dados[nome].builds || 0) + (dados[nome].gameplay || 0);
            salvarNotas(dados);
            return message.reply(`✅ Nota de **${nome}** atualizada: ${categoria} = ${valor}`);
        }

        // =================== !RETIRARNOTA / !RETNOTA ===================
        if (["retirarnota","retnota"].includes(comando)) {
            const nome = args.shift();
            const categoria = args.shift();
            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");
            if (!["pontualidade","disponibilidade","respeito","builds","gameplay"].includes(categoria)) return message.reply("❌ Categoria inválida.");
            dados[nome][categoria] = 0;
            dados[nome].total = (dados[nome].pontualidade || 0) + (dados[nome].disponibilidade || 0) + (dados[nome].respeito || 0) + (dados[nome].builds || 0) + (dados[nome].gameplay || 0);
            salvarNotas(dados);
            return message.reply(`🗑️ Nota de **${nome}** removida: ${categoria}`);
        }

        // =================== !ZERARNOTAS ===================
        if (comando === "zerarnotas") {
            message.reply("⚠️ Você tem certeza que quer zerar todas as notas? Responda `sim` ou `não`.");
            const filter = m => m.author.id === message.author.id && ["sim","não"].includes(m.content.toLowerCase());
            const collector = message.channel.createMessageCollector({ filter, max: 1, time: 15000 });
            collector.on("collect", m => {
                if (m.content.toLowerCase() === "sim") {
                    for (const j of Object.keys(dados)) {
                        dados[j].pontualidade = 0;
                        dados[j].disponibilidade = 0;
                        dados[j].respeito = 0;
                        dados[j].builds = 0;
                        dados[j].gameplay = 0;
                        dados[j].total = 0;
                        dados[j].status = "disputa";
                        dados[j].posicoes = ["Indefinido"];
                    }
                    salvarNotas(dados);
                    message.channel.send("✅ Todas as notas foram zeradas!");
                } else {
                    message.channel.send("❌ Cancelado!");
                }
            });
            return;
        }

        // =================== !AVALIAR ===================
        if (comando === "avaliar") {
            const nome = args.shift();
            if (!dados[nome]) return message.reply("❌ Jogador não encontrado.");
            const valores = args.map(v => Number(v));
            if (valores.length !== 5 || valores.some(v => isNaN(v) || v < 0))
                return message.reply("❌ Use: !avaliar <nome> <pontualidade> <disponibilidade> <respeito> <builds> <gameplay>");
            [dados[nome].pontualidade, dados[nome].disponibilidade, dados[nome].respeito, dados[nome].builds, dados[nome].gameplay] = valores;
            dados[nome].total = valores.reduce((a,b)=>a+b,0);
            salvarNotas(dados);
            return message.reply(`✅ Notas de **${nome}** atualizadas!`);
        }

        return message.reply("❌ Comando de notas inválido.");
    }
};