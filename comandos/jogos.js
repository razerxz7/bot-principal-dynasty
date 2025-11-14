// ==========================
// JOGOS.JS - DYNASTY ES (auto-fetch LBE)
// ==========================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

const caminhoJogos = path.join(__dirname, "./jogos.json");

// CONFIG — ajusta aqui
const CHAMP_IDS = [37, 39, 42, 43, 44, 45]; // ids dos campeonatos (ex.: 37 = Copa Ouro)
const TEAM_ID = "363"; // id do seu time na LBE (usado pra identificar o lado)

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

// ===== Helper: busca uma página da LBE e parseia os cards =====
async function fetchCampeonato(id) {
    const url = `https://www.lbesports.com/AreadoPlayer/areadoplayer.php?file=agendadotime&campeonato=${id}`;
    try {
        const res = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        // Cada ".card.shadow.col-xl-12" representa uma rodada no HTML que tu mandou
        const rodadaCards = $(".card.shadow.col-xl-12");
        const rodadaObj = [];

        rodadaCards.each((i, card) => {
            const rodadaText = $(card).find(".card-header").text().trim(); // ex: "Rodada: 01"
            const rodadaMatch = rodadaText.match(/Rodada:\s*(\d+)/i);
            const rodadaNum = rodadaMatch ? rodadaMatch[1] : (i+1).toString();

            // cada card tem uma tabela com linhas; pega cada bloco de jogo
            $(card).find("table tr").each((j, tr) => {
                // busca as tds com os times e a central com data/hora e placar
                const tds = $(tr).find("td");
                if (tds.length >= 3) {
                    const left = $(tds[0]).find("a").first();
                    const center = $(tds[1]).text().trim().replace(/\s+/g, " ");
                    const right = $(tds[2]).find("a").first();

                    const leftName = left.text().trim() || null;
                    const leftHref = left.attr("href") || "";
                    const rightName = right.text().trim() || null;
                    const rightHref = right.attr("href") || "";

                    // center pode conter "0 X 2 27/10/2025 21:10" ou só " 13/11/2025 21:10"
                    // extrai possivel placar e data/hora
                    let placar = null, data = null, horario = null;
                    const centerClean = center.replace(/\u00A0/g, " "); // nbsp
                    // tenta pegar data final (formato dd/mm/yyyy HH:MM)
                    const dateMatch = centerClean.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
                    if (dateMatch) {
                        data = dateMatch[1];
                        horario = dateMatch[2];
                    }
                    // tenta extrair placar (N X N)
                    const scoreMatch = centerClean.match(/(\d+)\s*[Xx×]\s*(\d+)/);
                    if (scoreMatch) {
                        placar = `${scoreMatch[1]} X ${scoreMatch[2]}`;
                    }

                    // detecta se nosso time está no left ou right (por time id no href ou pelo nome)
                    const leftIsUs = /time=(\d+)/i.test(leftHref) && leftHref.includes(`time=${TEAM_ID}`);
                    const rightIsUs = /time=(\d+)/i.test(rightHref) && rightHref.includes(`time=${TEAM_ID}`);
                    const leftIsUsByName = leftName && leftName.toLowerCase().includes("dynasty");
                    const rightIsUsByName = rightName && rightName.toLowerCase().includes("dynasty");

                    const isUsLeft = leftIsUs || leftIsUsByName;
                    const isUsRight = rightIsUs || rightIsUsByName;

                    // calcula emoji resultado se tiver placar e time detectado
                    let resultadoEmoji = "❔";
                    if (placar && (isUsLeft || isUsRight)) {
                        const parts = placar.split(/[Xx×]/).map(p => parseInt(p.trim(), 10));
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                            const [l, r] = parts;
                            const usScore = isUsLeft ? l : r;
                            const oppScore = isUsLeft ? r : l;
                            resultadoEmoji = usScore > oppScore ? "✅" : usScore < oppScore ? "❌" : "⚖️";
                        }
                    }

                    // nome do campeonato pode estar no botão "Ver Jogo" href (tem torneio=?), mas aqui não é sempre
                    // vamos retornar o objeto bruto
                    rodadaObj.push({
                        rodada: rodadaNum,
                        leftName,
                        rightName,
                        data,
                        horario,
                        placar,
                        resultadoEmoji,
                        leftHref,
                        rightHref
                    });
                }
            });
        });

        return rodadaObj;
    } catch (err) {
        // console.error("Erro fetch LBE", id, err.message);
        return null;
    }
}

// ===== Comandos =====
module.exports = {
    nome: "jogos",
    descricao: "Comandos de jogos do Dynasty ES.",

    // !jogos -> busca ao vivo nos campeonatos configurados e mostra organizado
    async jogos(message) {
        // avisa que ta buscando
        const aviso = await message.channel.send("🔎 Buscando jogos na LBE... pode demorar 1-2s");
        const resultadosPorCamp = {};

        for (const cid of CHAMP_IDS) {
            const arr = await fetchCampeonato(cid);
            if (arr && arr.length) {
                resultadosPorCamp[cid] = arr;
            }
        }

        // se não pegou nada, tenta usar o local (fallback)
        if (Object.keys(resultadosPorCamp).length === 0) {
            await aviso.delete().catch(()=>{});
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
                    return `🏁 Rodada: ${j.rodada}\n🆚 Adversário: ${j.adversario}\n📅 ${j.data} ⏰ ${j.horario}\nResultado: ${resultado}`;
                }).join("\n\n"))
                .setFooter({ text: "Dynasty ES 💜" });
            return message.channel.send({ embeds: [embed] });
        }

        // monta embed por campeonato
        await aviso.delete().catch(()=>{});
        for (const [cid, jogosArr] of Object.entries(resultadosPorCamp)) {
            // transforma em texto agrupado por rodada
            let grupos = {};
            for (const j of jogosArr) {
                grupos[j.rodada] = grupos[j.rodada] || [];
                grupos[j.rodada].push(j);
            }

            let descricao = "";
            for (const rodada of Object.keys(grupos).sort((a,b)=>parseInt(a)-parseInt(b))) {
                descricao += `**🏁 Rodada ${rodada}**\n`;
                for (const g of grupos[rodada]) {
                    const left = g.leftName || "—";
                    const right = g.rightName || "—";
                    const timeText = g.placar ? `${g.placar} ${g.resultadoEmoji}` : " — ";
                    const dateText = g.data ? `📅 ${g.data} ⏰ ${g.horario||"?"}` : "";
                    descricao += `• ${left} ⚽ ${right} — ${timeText} ${dateText}\n`;
                }
                descricao += `\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`📆 Campeonato ${cid}`)
                .setColor("#7d00ff")
                .setDescription(descricao || "Nenhum jogo encontrado")
                .setFooter({ text: `Dados extraídos da LBE — campeonato ${cid}` });

            await message.channel.send({ embeds: [embed] });
        }
    },

    // mantive os outros comandos originais (fallbacks / edição manual)
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