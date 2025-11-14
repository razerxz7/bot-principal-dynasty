// ==========================
// JOGOS.JS - DYNASTY ES (auto-fetch LBE)
// ==========================

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

const caminhoJogos = path.join(__dirname, "./jogos.json");

// CONFIG
const CHAMP_IDS = [37, 39, 42, 43, 44, 45];
const TEAM_ID = "363";

// ==============================
// JSON
// ==============================
function carregarJogos() {
    if (!fs.existsSync(caminhoJogos)) {
        fs.writeFileSync(caminhoJogos, JSON.stringify({ dias: [], nextSemana: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(caminhoJogos, "utf8"));
}
function salvarJogos(dados) {
    fs.writeFileSync(caminhoJogos, JSON.stringify(dados, null, 2));
}

// ==============================
// SCRAPER LBE
// ==============================
async function fetchCampeonato(id) {
    const url = `https://www.lbesports.com/AreadoPlayer/areadoplayer.php?file=agendadotime&campeonato=${id}`;
    try {
        const res = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(res.data);
        const jogos = [];

        $("table tr").each((i, tr) => {
            const tds = $(tr).find("td");
            if (tds.length < 3) return;

            const leftA = $(tds[0]).find("a").first();
            const rightA = $(tds[2]).find("a").first();

            const leftName = leftA.text().trim() || $(tds[0]).text().trim();
            const rightName = rightA.text().trim() || $(tds[2]).text().trim();

            const leftHref = leftA.attr("href") || "";
            const rightHref = rightA.attr("href") || "";

            const center = $(tds[1]).text().replace(/\s+/g, " ").trim();

            let data = null, horario = null;
            const matchData = center.match(/(\d{2}\/\d{2}(?:\/\d{4})?)\s+(\d{2}:\d{2})/);
            if (matchData) {
                data = matchData[1];
                horario = matchData[2];
            }

            let placar = null;
            const matchPlacar = center.match(/(\d+)\s*[xX×]\s*(\d+)/);
            if (matchPlacar) {
                placar = `${matchPlacar[1]} X ${matchPlacar[2]}`;
            }

            const leftUs = leftHref.includes(`time=${TEAM_ID}`) || leftName.toLowerCase().includes("dynasty");
            const rightUs = rightHref.includes(`time=${TEAM_ID}`) || rightName.toLowerCase().includes("dynasty");

            let resultadoEmoji = "❔";
            if (placar && (leftUs || rightUs)) {
                const [l, r] = placar.split(/[xX×]/).map(n => parseInt(n.trim()));
                const myScore = leftUs ? l : r;
                const oppScore = leftUs ? r : l;
                resultadoEmoji = myScore > oppScore ? "✅" : myScore < oppScore ? "❌" : "⚖️";
            }

            const rodada = $(tr).closest(".card").find(".card-header").text().replace(/\D+/g, "") || "";

            jogos.push({
                rodada,
                leftName,
                rightName,
                data,
                horario,
                placar,
                resultadoEmoji
            });
        });

        return jogos;
    } catch (e) {
        return null;
    }
}

async function fetchAll() {
    const final = {};
    for (const id of CHAMP_IDS) {
        const jogos = await fetchCampeonato(id);
        if (jogos && jogos.length) final[id] = jogos;
    }
    return final;
}

// ==============================
// MÓDULO PRINCIPAL
// ==============================
module.exports = {
    nome: "jogos",

    // ==============================
    // !jogos
    // ==============================
    async jogos(message) {
        const aviso = await message.reply("🔎 Puxando jogos da LBE...");

        const dados = await fetchAll();

        if (!Object.keys(dados).length) {
            await aviso.delete().catch(() => { });
            return message.reply("❌ Não consegui puxar nada da LBE.");
        }

        await aviso.delete().catch(() => { });

        for (const campId of Object.keys(dados)) {
            const jogos = dados[campId];

            let texto = "";
            for (const j of jogos) {
                texto += `🏁 Rodada **${j.rodada || "?"}**\n`;
                texto += `**${j.leftName}** ⚽ **${j.rightName}**\n`;
                texto += j.placar ? `➡️ ${j.placar} ${j.resultadoEmoji}\n` : "";
                texto += j.data ? `📅 ${j.data} ⏰ ${j.horario}\n\n` : "\n";
            }

            const embed = new EmbedBuilder()
                .setTitle(`📆 Campeonato ${campId}`)
                .setColor("#7d00ff")
                .setDescription(texto)
                .setFooter({ text: "Dynasty ES 💜 — Dados da LBE" });

            await message.channel.send({ embeds: [embed] });
        }
    },

    // ==============================
    // !updatejogos
    // ==============================
    async updatejogos(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply("❌ Só ADM usa isso.");

        const msg = await message.reply("🔁 Salvando jogos da LBE...");

        const dados = await fetchAll();
        const json = carregarJogos();
        json.fetched = dados;
        salvarJogos(json);

        msg.edit("✅ Jogos salvos dentro do JSON!");
    },

    // ==============================
    // !jogossem
    // ==============================
    async jogossem(message) {
        const dados = carregarJogos();
        if (!dados.dias.length) return message.reply("❌ Não há jogos na semana.");

        let texto = "";
        for (const dia of dados.dias) {
            texto += `**📅 ${dia.dia}**\n`;
            for (const j of dia.jogos) {
                texto += `• ${j.adversario} — Rodada ${j.rodada} — ${j.campeonato}\n`;
                texto += `  ⏰ ${j.data} ${j.horario} — ${j.resultado || "❔"}\n`;
            }
            texto += "\n";
        }

        const embed = new EmbedBuilder()
            .setTitle("📆 Jogos da Semana")
            .setColor("#7d00ff")
            .setDescription(texto);

        message.channel.send({ embeds: [embed] });
    },

    // ==============================
    // !proxsemana
    // ==============================
    async proxsemana(message) {
        const dados = carregarJogos();
        const lista = dados.nextSemana;

        if (!lista || !lista.length)
            return message.reply("❌ Próxima semana não cadastrada.");

        let texto = "";
        for (const dia of lista) {
            texto += `**📅 ${dia.dia}**\n`;
            for (const j of dia.jogos) {
                texto += `• ${j.adversario} — ${j.campeonato}\n`;
                texto += `  Rodada ${j.rodada} ⏰ ${j.data} ${j.horario}\n`;
            }
            texto += "\n";
        }

        const embed = new EmbedBuilder()
            .setTitle("📆 Jogos da Próxima Semana")
            .setColor("#7d00ff")
            .setDescription(texto);

        message.channel.send({ embeds: [embed] });
    },

    // ==============================
    // !addjogos
    // ==============================
    async addjogos(message, args) {
        const partes = args.join(" ").split("|").map(t => t.trim());
        if (partes.length < 6)
            return message.reply("❌ Use: !addjogos <dia> | <rodada> | <data> | <adversário> | <campeonato> | <horário>");

        const [dia, rodada, data, adversario, campeonato, horario] = partes;

        const dados = carregarJogos();
        let diaObj = dados.dias.find(d => d.dia.toLowerCase() === dia.toLowerCase());

        if (!diaObj) {
            diaObj = { dia, jogos: [] };
            dados.dias.push(diaObj);
        }

        diaObj.jogos.push({
            rodada,
            data,
            adversario,
            campeonato,
            horario,
            resultado: "❔"
        });

        salvarJogos(dados);
        message.reply(`✅ Adicionado jogo contra **${adversario}** na **${dia}**`);
    },

    // ==============================
    // !editarjogo
    // ==============================
    async editarjogo(message, args) {
        const partes = args.join(" ").split("|").map(t => t.trim());
        if (partes.length < 3)
            return message.reply("❌ Use: !editarjogo <adversário> | <campo> | <novo valor>");

        const [adversario, campo, ...valorArr] = partes;
        const valor = valorArr.join(" ");

        const dados = carregarJogos();
        let achou = false;

        for (const dia of dados.dias) {
            for (const jogo of dia.jogos) {
                if (jogo.adversario.toLowerCase() === adversario.toLowerCase()) {
                    if (jogo[campo] !== undefined) {
                        jogo[campo] = valor;
                        achou = true;
                    }
                }
            }
        }

        if (!achou) return message.reply("❌ Não achei esse jogo.");

        salvarJogos(dados);
        message.reply("✅ Jogo editado!");
    },

    // ==============================
    // !addresult
    // ==============================
    async addresult(message, args) {
        const partes = args.join(" ").split("|").map(t => t.trim());
        if (partes.length < 3)
            return message.reply("❌ Use: !addresult <adversário> | <placar> | <vit/der/emp>");

        const [adv, placar, tipo] = partes;

        const emoji = tipo === "vit" ? "✅" : tipo === "der" ? "❌" : "⚖️";

        const dados = carregarJogos();
        let achou = false;

        for (const dia of dados.dias) {
            for (const j of dia.jogos) {
                if (j.adversario.toLowerCase() === adv.toLowerCase()) {
                    j.resultado = `${placar} ${emoji}`;
                    achou = true;
                }
            }
        }

        if (!achou) return message.reply("❌ Não achei o jogo.");

        salvarJogos(dados);
        message.reply("✅ Resultado atualizado!");
    },

    // ==============================
    // !removerjogo
    // ==============================
    async removerjogo(message, args) {
        const partes = args.join(" ").split("|").map(t => t.trim());
        const adv = partes[0];

        const dados = carregarJogos();
        let removeu = false;

        for (const dia of dados.dias) {
            const index = dia.jogos.findIndex(j => j.adversario.toLowerCase() === adv.toLowerCase());
            if (index !== -1) {
                dia.jogos.splice(index, 1);
                removeu = true;
                break;
            }
        }

        if (!removeu) return message.reply("❌ Não achei esse jogo.");

        salvarJogos(dados);
        message.reply("🗑️ Jogo removido!");
    },

    // ==============================
    // !modificarjogos
    // ==============================
    async modificarjogos(message, args) {
        const partes = args.join(" ").split("|").map(t => t.trim());
        if (partes.length < 4)
            return message.reply("❌ Use: !modificarjogos <adv1> | <adv2> | <campo> | <valor>");

        const campo = partes[partes.length - 2];
        const valor = partes[partes.length - 1];
        const adversarios = partes.slice(0, partes.length - 2);

        const dados = carregarJogos();
        let alterados = 0;

        for (const dia of dados.dias) {
            for (const jogo of dia.jogos) {
                if (adversarios.includes(jogo.adversario)) {
                    if (jogo[campo] !== undefined) {
                        jogo[campo] = valor;
                        alterados++;
                    }
                }
            }
        }

        if (!alterados) return message.reply("❌ Nada foi alterado.");

        salvarJogos(dados);
        message.reply(`✅ ${alterados} jogos atualizados!`);
    },

    // ==============================
    // !limparjogos
    // ==============================
    async limparjogos(message) {
        salvarJogos({ dias: [], nextSemana: [] });
        message.reply("🧹 Jogos da semana limpos!");
    }
};