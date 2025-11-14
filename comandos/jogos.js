// ==========================
// JOGOS.JS - DYNASTY ES (completo)
// ==========================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

const caminhoJogos = path.join(__dirname, "../jogos.json"); // ajusta se teu index usar outro caminho

// ===== CONFIG =====
// IDs dos campeonatos na LBE que tu quer buscar
const CHAMP_IDS = [37, 39, 42, 43, 44, 45];
// Map opcional de id -> nome (ajusta conforme quiser)
const CHAMP_MAP = {
  37: "Copa Ouro",
  39: "E-Brasileirão Série B",
  42: "Initial Season",
  43: "Beginning Season",
  44: "Initial Championship",
  45: "Copa João Havelange"
};
// ID do time (usado pra detectar qual lado é o Dynasty). Se não souber, mantém 363 como tu disse.
const TEAM_ID = "363";

// ===== util: ler/escrever json =====
function carregarJogos() {
  if (!fs.existsSync(caminhoJogos)) {
    fs.writeFileSync(caminhoJogos, JSON.stringify({ dias: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(caminhoJogos, "utf8"));
  } catch (e) {
    console.error("Erro ao ler jogos.json:", e);
    return { dias: [] };
  }
}
function salvarJogos(dados) {
  fs.writeFileSync(caminhoJogos, JSON.stringify(dados, null, 2));
}

// ===== util: pega nome do dia da semana a partir de dd/mm/yyyy =====
function weekdayPTFromDateStr(dateStr) {
  // espera dd/mm ou dd/mm/yyyy
  try {
    const parts = dateStr.split("/").map(p => p.trim());
    if (parts.length < 2) return "Indefinido";
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
    const d = new Date(year, month, day);
    const dias = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
    return dias[d.getDay()] || "Indefinido";
  } catch {
    return "Indefinido";
  }
}

// ===== helper: faz fetch da página da LBE e parseia jogos =====
async function fetchCampeonato(id) {
  const url = `https://www.lbesports.com/AreadoPlayer/areadoplayer.php?file=agendadotime&campeonato=${id}`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(res.data);

    // estrutura genérica: percorre blocos de jogos / linhas
    const jogos = [];

    // Muitas páginas usam linhas <tr> com 3 colunas: timeA | info | timeB
    $("table tr").each((i, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 3) {
        const left = $(tds[0]).text().trim().replace(/\s+/g, " ");
        const center = $(tds[1]).text().trim().replace(/\s+/g, " ");
        const right = $(tds[2]).text().trim().replace(/\s+/g, " ");

        // extrai placar se existir
        const scoreMatch = center.match(/(\d+)\s*[Xx×]\s*(\d+)/);
        const placar = scoreMatch ? `${scoreMatch[1]}x${scoreMatch[2]}` : null;

        // extrai data/hora (tenta formatos dd/mm/yyyy HH:MM ou dd/mm HH:MM)
        let data = null, horario = null;
        const datetimeMatch = center.match(/(\d{2}\/\d{2}(?:\/\d{4})?)\s+(\d{2}:\d{2})/);
        if (datetimeMatch) {
          data = datetimeMatch[1];
          horario = datetimeMatch[2];
        } else {
          // tenta só hora
          const timeOnly = center.match(/(\d{2}:\d{2})/);
          if (timeOnly) horario = timeOnly[1];
        }

        // tenta extrair links para detectar team ids (se houver)
        const leftHref = $(tds[0]).find("a").attr("href") || "";
        const rightHref = $(tds[2]).find("a").attr("href") || "";

        const leftIsUs = (leftHref && leftHref.includes(`time=${TEAM_ID}`)) || (left && left.toLowerCase().includes("dynasty"));
        const rightIsUs = (rightHref && rightHref.includes(`time=${TEAM_ID}`)) || (right && right.toLowerCase().includes("dynasty"));

        // resultado emoji para nosso time (se placar existir)
        let emoji = "❔";
        if (placar && (leftIsUs || rightIsUs)) {
          const parts = placar.split(/[xX]/).map(p => parseInt(p.trim(), 10));
          if (parts.length === 2) {
            const [l, r] = parts;
            const us = leftIsUs ? l : r;
            const op = leftIsUs ? r : l;
            emoji = us > op ? "✅" : us < op ? "❌" : "⚖️";
          }
        }

        // monta objeto padrão
        jogos.push({
          rodada: null,
          campeonatoId: id,
          campeonato: CHAMP_MAP[id] || `Campeonato ${id}`,
          leftName: left || null,
          rightName: right || null,
          data,
          horario,
          placar,
          resultadoEmoji: emoji,
          leftHref,
          rightHref
        });
      }
    });

    // tentativa alternativa: alguns HTMLs mostram blocos com .card - tenta parsear também
    $(".card.shadow.col-xl-12").each((i, card) => {
      const header = $(card).find(".card-header").text().trim();
      const rodadaMatch = header.match(/Rodada[:\s]*([0-9]+)/i);
      const rodada = rodadaMatch ? rodadaMatch[1] : null;

      $(card).find("table tr").each((j, tr) => {
        const tds = $(tr).find("td");
        if (tds.length >= 3) {
          const left = $(tds[0]).text().trim().replace(/\s+/g, " ");
          const center = $(tds[1]).text().trim().replace(/\s+/g, " ");
          const right = $(tds[2]).text().trim().replace(/\s+/g, " ");

          const scoreMatch = center.match(/(\d+)\s*[Xx×]\s*(\d+)/);
          const placar = scoreMatch ? `${scoreMatch[1]}x${scoreMatch[2]}` : null;
          let data = null, horario = null;
          const datetimeMatch = center.match(/(\d{2}\/\d{2}(?:\/\d{4})?)\s+(\d{2}:\d{2})/);
          if (datetimeMatch) {
            data = datetimeMatch[1];
            horario = datetimeMatch[2];
          }
          const leftHref = $(tds[0]).find("a").attr("href") || "";
          const rightHref = $(tds[2]).find("a").attr("href") || "";
          const leftIsUs = (leftHref && leftHref.includes(`time=${TEAM_ID}`)) || (left && left.toLowerCase().includes("dynasty"));
          const rightIsUs = (rightHref && rightHref.includes(`time=${TEAM_ID}`)) || (right && right.toLowerCase().includes("dynasty"));

          let emoji = "❔";
          if (placar && (leftIsUs || rightIsUs)) {
            const parts = placar.split(/[xX]/).map(p => parseInt(p.trim(), 10));
            if (parts.length === 2) {
              const [l, r] = parts;
              const us = leftIsUs ? l : r;
              const op = leftIsUs ? r : l;
              emoji = us > op ? "✅" : us < op ? "❌" : "⚖️";
            }
          }

          jogos.push({
            rodada: rodada || null,
            campeonatoId: id,
            campeonato: CHAMP_MAP[id] || `Campeonato ${id}`,
            leftName: left || null,
            rightName: right || null,
            data,
            horario,
            placar,
            resultadoEmoji: emoji,
            leftHref,
            rightHref
          });
        }
      });
    });

    return jogos;
  } catch (err) {
    // falha no fetch -> retorna null (quem chamar decide fallback)
    console.error(`Erro ao buscar LBE (campeonato ${id}):`, err.message);
    return null;
  }
}

// ===== comando: updatejogos -> busca LBE e salva em jogos.json =====
async function updateJogosFromLBE() {
  const all = {}; // chave: dia (segunda-feira etc) -> array de jogos
  for (const cid of CHAMP_IDS) {
    const arr = await fetchCampeonato(cid);
    if (!arr) continue;
    for (const j of arr) {
      // j.data provavelmente "dd/mm" ou "dd/mm/yyyy" -> transforma em dia da semana
      const dayName = j.data ? weekdayPTFromDateStr(j.data) : "Indefinido";
      if (!all[dayName]) all[dayName] = [];
      all[dayName].push({
        rodada: j.rodada || "",
        data: j.data || "",
        adversario: (j.leftName && j.leftName.toLowerCase().includes("dynasty")) ? j.rightName : j.leftName,
        adversario_full_left: j.leftName || "",
        adversario_full_right: j.rightName || "",
        campeonato: j.campeonato || CHAMP_MAP[j.campeonatoId] || `Campeonato ${j.campeonatoId}`,
        horario: j.horario || "",
        resultado: j.placar ? `${j.placar} ${j.resultadoEmoji||""}` : null,
        raw: j
      });
    }
  }

  // transformar em formato { dias: [ { dia: "Segunda-feira", jogos: [...] }, ... ] }
  const dados = { dias: [] };
  for (const [dia, jogosArr] of Object.entries(all)) {
    dados.dias.push({ dia: dia.charAt(0).toUpperCase() + dia.slice(1), jogos: jogosArr });
  }
  salvarJogos(dados);
  return dados;
}

// ===== Exported commands =====
module.exports = {
  nome: "jogos",
  descricao: "Comandos de jogos do Dynasty ES.",

  // !updatejogos -> força fetch da LBE e salva no jogos.json
  async updatejogos(message) {
    const aviso = await message.channel.send("🔄 Atualizando jogos da LBE... aguarda aí.");
    try {
      const dados = await updateJogosFromLBE();
      await aviso.delete().catch(()=>{});
      const embed = new EmbedBuilder()
        .setTitle("✅ Jogos atualizados (LBE)")
        .setColor("#7d00ff")
        .setDescription(`Foram atualizados os dias: ${dados.dias.map(d=>d.dia).join(", ")}`);
      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Erro em updatejogos:", err);
      await aviso.delete().catch(()=>{});
      return message.reply("❌ Falha ao atualizar jogos da LBE.");
    }
  },

  // !jogos -> busca ao vivo nos campeonatos configurados e mostra organizado (fallback para local se nada encontrado)
  async jogos(message) {
    const aviso = await message.channel.send("🔎 Buscando jogos na LBE... pode demorar 1-3s");
    try {
      const resultadosPorCamp = {};
      for (const cid of CHAMP_IDS) {
        const arr = await fetchCampeonato(cid);
        if (arr && arr.length) resultadosPorCamp[cid] = arr;
      }

      await aviso.delete().catch(()=>{});

      if (Object.keys(resultadosPorCamp).length === 0) {
        // fallback para o local
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

      // mandar um embed por campeonato (nome bonito se tiver)
      for (const [cid, jogosArr] of Object.entries(resultadosPorCamp)) {
        // agrupa por rodada
        const grupos = {};
        for (const j of jogosArr) {
          const rodada = j.rodada || "—";
          if (!grupos[rodada]) grupos[rodada] = [];
          grupos[rodada].push(j);
        }

        let descricao = "";
        for (const rodada of Object.keys(grupos).sort((a,b) => {
          const na = parseInt(a) || 0;
          const nb = parseInt(b) || 0;
          return na - nb;
        })) {
          descricao += `**🏁 Rodada ${rodada}**\n`;
          for (const g of grupos[rodada]) {
            const left = g.leftName || "—";
            const right = g.rightName || "—";
            const timeText = g.placar ? `${g.placar} ${g.resultadoEmoji||""}` : "—";
            const dateText = g.data ? `📅 ${g.data} ⏰ ${g.horario||"?"}` : (g.horario ? `⏰ ${g.horario}` : "");
            descricao += `• ${left} ⚽ ${right} — ${timeText} ${dateText}\n`;
          }
          descricao += `\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`📆 ${CHAMP_MAP[cid] || `Campeonato ${cid}`}`)
          .setColor("#7d00ff")
          .setDescription(descricao || "Nenhum jogo encontrado")
          .setFooter({ text: `Dados extraídos da LBE — campeonato ${cid}` });

        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Erro no comando !jogos:", err);
      await aviso.delete().catch(()=>{});
      return message.reply("❌ Erro ao buscar jogos.");
    }
  },

  // !jogossem -> mostra os jogos na semana a partir do jogos.json (atualiza primeiro se quiser)
  async jogossem(message) {
    const dados = carregarJogos();
    if (!dados.dias || !dados.dias.length) return message.reply("❌ Nenhum jogo cadastrado na semana.");
    const embed = new EmbedBuilder()
      .setTitle("📆 Jogos da Semana - Dynasty ES")
      .setColor("#7d00ff");
    let descricao = "";
    for (const dia of dados.dias) {
      descricao += `**${dia.dia}**\n`;
      descricao += dia.jogos.map(j => {
        const resultado = j.resultado || "❔";
        return `• ${j.adversario} | Rodada: ${j.rodada || "—"} | ${j.campeonato} | ${j.data} - ${j.horario} | ${resultado}`;
      }).join("\n");
      descricao += "\n\n";
    }
    embed.setDescription(descricao.trim());
    return message.channel.send({ embeds: [embed] });
  },

  // !jogosprox -> mostra os jogos da próxima semana (com base no jogos.json)
  async jogosprox(message) {
    // simples: assume dados.dias contém dias da semana; rota para "próxima semana" - aqui vamos só enviar os mesmos dias com label "Próxima Semana"
    const dados = carregarJogos();
    if (!dados.dias || !dados.dias.length) return message.reply("❌ Nenhum jogo cadastrado pra próxima semana.");
    const embed = new EmbedBuilder()
      .setTitle("📆 Jogos - Próxima Semana")
      .setColor("#7d00ff");
    let descricao = "";
    for (const dia of dados.dias) {
      descricao += `**${dia.dia} (próxima)**\n`;
      descricao += dia.jogos.map(j => {
        const resultado = j.resultado || "❔";
        return `• ${j.adversario} | Rodada: ${j.rodada || "—"} | ${j.campeonato} | ${j.data} - ${j.horario} | ${resultado}`;
      }).join("\n");
      descricao += "\n\n";
    }
    embed.setDescription(descricao.trim());
    return message.channel.send({ embeds: [embed] });
  },

  // !jogo <dia> -> busca por dia específico
  async jogo(message, args) {
    if (!args.length) return message.reply("❌ Use: `!jogo <dia>` (segunda, terça, quinta, etc).");
    const diaInput = args[0].toLowerCase();
    const diasAceitos = ["segunda", "segunda-feira", "terca", "terça", "terça-feira", "quarta", "quarta-feira", "quinta", "quinta-feira", "sexta", "sexta-feira", "sábado", "sabado", "domingo"];
    if (!diasAceitos.some(d => diaInput.includes(d))) return message.reply("❌ Dia inválido. Use segunda, terça, quinta, etc.");

    const dados = carregarJogos();
    const jogosDia = dados.dias.find(d => d.dia.toLowerCase().includes(diaInput));
    if (!jogosDia || !jogosDia.jogos.length) return message.reply(`❌ Nenhum jogo cadastrado para ${args[0]}.`);

    const embed = new EmbedBuilder()
      .setTitle(`📅 Jogos - ${jogosDia.dia}`)
      .setColor("#7d00ff")
      .setDescription(jogosDia.jogos.map(j => {
        let resultado = j.resultado || "❔";
        return `**Adversário:** ${j.adversario} | **Rodada:** ${j.rodada || "—"} | **Campeonato:** ${j.campeonato} | ${j.data} - ${j.horario} | ${resultado}`;
      }).join("\n\n"))
      .setFooter({ text: "Dynasty ES 💜" });

    return message.channel.send({ embeds: [embed] });
  },

  // ===== comandos manuais já existentes =====

  // !addresult <adversário> | <placar> | <vit/der/emp>
  async addresult(message, args) {
    if (args.length < 3) return message.reply("❌ Use: `!addresult <adversário> | <placar> | <vit/der/emp>`");
    const [adversario, placar, tipo] = args.join(" ").split("|").map(p => p.trim());
    const dados = carregarJogos();
    let encontrado = false;
    for (const dia of dados.dias) {
      for (const jogo of dia.jogos) {
        if (jogo.adversario.toLowerCase() === adversario.toLowerCase()) {
          const emoji = tipo === "vit" ? "✅" : tipo === "der" ? "❌" : tipo === "emp" ? "⚖️" : "";
          jogo.resultado = `${placar} ${emoji}`;
          encontrado = true;
          break;
        }
      }
    }
    if (!encontrado) return message.reply("❌ Jogo não encontrado.");
    salvarJogos(dados);
    return message.reply(`✅ Resultado de **${adversario}** atualizado!`);
  },

  // !editarjogo <adversário> | <campo> | <novo valor>
  async editarjogo(message, args) {
    if (args.length < 3) return message.reply("❌ Use: `!editarjogo <adversário> | <campo> | <novo valor>`");
    const [adversario, campo, ...valorArr] = args.join(" ").split("|").map(p => p.trim());
    const valor = valorArr.join(" ");
    const dados = carregarJogos();
    let encontrado = false;
    for (const dia of dados.dias) {
      for (const jogo of dia.jogos) {
        if (jogo.adversario.toLowerCase() === adversario.toLowerCase()) {
          if (jogo.hasOwnProperty(campo)) {
            jogo[campo] = valor;
            encontrado = true;
            break;
          }
        }
      }
    }
    if (!encontrado) return message.reply("❌ Jogo não encontrado ou campo inválido.");
    salvarJogos(dados);
    return message.reply(`✅ Jogo de **${adversario}** atualizado!`);
  },

  // !modificarjogos <adv1> | <adv2> | <campo> | <novo valor>
  async modificarjogos(message, args) {
    if (args.length < 4) return message.reply("❌ Use: `!modificarjogos <adv1> | <adv2> | <campo> | <novo valor>`");
    const partes = args.join(" ").split("|").map(p => p.trim());
    const campo = partes[partes.length - 2];
    const novoValor = partes[partes.length - 1];
    const adversarios = partes.slice(0, partes.length - 2);
    const dados = carregarJogos();
    let alterados = 0;
    for (const dia of dados.dias) {
      for (const jogo of dia.jogos) {
        if (adversarios.some(a => a.toLowerCase() === jogo.adversario.toLowerCase())) {
          if (jogo.hasOwnProperty(campo)) {
            jogo[campo] = novoValor;
            alterados++;
          }
        }
      }
    }
    if (alterados === 0) return message.reply("❌ Nenhum jogo correspondente encontrado ou campo inválido.");
    salvarJogos(dados);
    return message.reply(`✅ Campo **${campo}** atualizado para **${alterados}** jogos.`);
  },

  // !limparjogos -> limpa tudo
  async limparjogos(message) {
    salvarJogos({ dias: [] });
    return message.reply("🧹 Todos os jogos da semana foram removidos!");
  },

  // !addjogos <dia> | <rodada> | <data> | <adversário> | <campeonato> | <horário>
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
      rodada: rodada || "",
      data,
      adversario,
      campeonato,
      horario,
      resultado: null
    });
    salvarJogos(dados);
    return message.reply(`✅ Jogo **${adversario}** adicionado em **${dia}**!`);
  },

  // !removerjogo <adversário> | <dia (opcional)>
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
    return message.reply(`✅ Jogo de **${adversario}** removido!`);
  }
};