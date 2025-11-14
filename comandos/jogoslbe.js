// ==========================
// JOGOSLBE.JS - Fetch LBE Dynasty ES
// ==========================

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const caminhoJogos = path.join(__dirname, "../jogos.json");

// ===== CONFIG =====
const CHAMP_IDS = [37, 39, 42, 43, 44, 45];
const CHAMP_MAP = {
  37: "Copa Ouro",
  39: "E-Brasileirão Série B",
  42: "Initial Season",
  43: "Beginning Season",
  44: "Initial Championship",
  45: "Copa João Havelange"
};
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

// ===== util: pega dia da semana =====
function weekdayPTFromDateStr(dateStr) {
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

// ===== fetch campeonato =====
async function fetchCampeonato(id) {
  const url = `https://www.lbesports.com/AreadoPlayer/areadoplayer.php?file=agendadotime&campeonato=${id}`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(res.data);
    const jogos = [];

    $("table tr").each((i, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 3) {
        const left = $(tds[0]).text().trim();
        const center = $(tds[1]).text().trim();
        const right = $(tds[2]).text().trim();

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
        const leftIsUs = leftHref.includes(`time=${TEAM_ID}`) || left.toLowerCase().includes("dynasty");
        const rightIsUs = rightHref.includes(`time=${TEAM_ID}`) || right.toLowerCase().includes("dynasty");

        let emoji = "❔";
        if (placar && (leftIsUs || rightIsUs)) {
          const [l, r] = placar.split(/[xX]/).map(p => parseInt(p.trim(), 10));
          const us = leftIsUs ? l : r;
          const op = leftIsUs ? r : l;
          emoji = us > op ? "✅" : us < op ? "❌" : "⚖️";
        }

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

    return jogos;
  } catch (err) {
    console.error(`Erro ao buscar campeonato ${id}:`, err.message);
    return null;
  }
}

// ===== update geral =====
async function updateJogosFromLBE() {
  const all = {};
  for (const cid of CHAMP_IDS) {
    const arr = await fetchCampeonato(cid);
    if (!arr) continue;
    for (const j of arr) {
      const dayName = j.data ? weekdayPTFromDateStr(j.data) : "Indefinido";
      if (!all[dayName]) all[dayName] = [];
      all[dayName].push({
        rodada: j.rodada || "",
        data: j.data || "",
        adversario: (j.leftName.toLowerCase().includes("dynasty")) ? j.rightName : j.leftName,
        adversario_full_left: j.leftName || "",
        adversario_full_right: j.rightName || "",
        campeonato: j.campeonato || CHAMP_MAP[j.campeonatoId] || `Campeonato ${j.campeonatoId}`,
        horario: j.horario || "",
        resultado: j.placar ? `${j.placar} ${j.resultadoEmoji||""}` : null,
        raw: j
      });
    }
  }

  const dados = { dias: [] };
  for (const [dia, jogosArr] of Object.entries(all)) {
    dados.dias.push({ dia: dia.charAt(0).toUpperCase() + dia.slice(1), jogos: jogosArr });
  }

  salvarJogos(dados);
  return dados;
}

// ===== EXPORT =====
module.exports = {
  updateJogosFromLBE,
};