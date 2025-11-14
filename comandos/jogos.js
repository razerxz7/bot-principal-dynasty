// ==========================
// JOGOS.JS - DYNASTY ES (Atualizado LBE + Próxima Semana)
// ==========================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
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
const TEAM_ID = "363"; // ID do Dynasty

// ===== UTIL =====
function carregarJogos() {
  if (!fs.existsSync(caminhoJogos)) fs.writeFileSync(caminhoJogos, JSON.stringify({ dias: [] }, null, 2));
  try { return JSON.parse(fs.readFileSync(caminhoJogos, "utf8")); } 
  catch { return { dias: [] }; }
}
function salvarJogos(dados) { fs.writeFileSync(caminhoJogos, JSON.stringify(dados, null, 2)); }
function weekdayPTFromDateStr(dateStr) {
  try {
    const parts = dateStr.split("/").map(p => p.trim());
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
    const d = new Date(year, month, day);
    const dias = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
    return dias[d.getDay()] || "Indefinido";
  } catch { return "Indefinido"; }
}

// ===== FETCH LBE =====
async function fetchCampeonato(id) {
  const url = `https://www.lbesports.com/AreadoPlayer/areadoplayer.php?file=agendadotime&campeonato=${id}`;
  console.log(`🔗 Buscando campeonato ${id} na LBE...`);
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(res.data);
    const jogos = [];

    $("table tr").each((i, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 3) {
        const left = $(tds[0]).text().trim().replace(/\s+/g, " ");
        const center = $(tds[1]).text().trim().replace(/\s+/g, " ");
        const right = $(tds[2]).text().trim().replace(/\s+/g, " ");
        if (!left && !right) return;

        let data = null, horario = null;
        const datetimeMatch = center.match(/(\d{2}\/\d{2}(?:\/\d{4})?)\s+(\d{2}:\d{2})/);
        if (datetimeMatch) { data = datetimeMatch[1]; horario = datetimeMatch[2]; }

        const leftHref = $(tds[0]).find("a").attr("href") || "";
        const rightHref = $(tds[2]).find("a").attr("href") || "";
        const leftIsUs = (leftHref && leftHref.includes(`time=${TEAM_ID}`)) || left.toLowerCase().includes("dynasty");
        const rightIsUs = (rightHref && rightHref.includes(`time=${TEAM_ID}`)) || right.toLowerCase().includes("dynasty");

        let placar = null, resultadoEmoji = "❔";
        const scoreMatch = center.match(/(\d+)\s*[xX×]\s*(\d+)/);
        if (scoreMatch) {
          placar = `${scoreMatch[1]}x${scoreMatch[2]}`;
          if (leftIsUs || rightIsUs) {
            const [l,r] = scoreMatch.slice(1,3).map(Number);
            const us = leftIsUs ? l : r;
            const op = leftIsUs ? r : l;
            resultadoEmoji = us>op?"✅":us<op?"❌":"⚖️";
          }
        }

        jogos.push({
          rodada: null,
          campeonatoId: id,
          campeonato: CHAMP_MAP[id] || `Campeonato ${id}`,
          leftName: left,
          rightName: right,
          data,
          horario,
          placar,
          resultadoEmoji,
          leftHref,
          rightHref
        });
      }
    });

    console.log(`✅ Campeonato ${id} encontrou ${jogos.length} jogos`);
    return jogos;
  } catch (err) { console.error(`❌ Erro fetch LBE ${id}:`, err.message); return null; }
}

// ===== UPDATE JOGOS =====
async function updateJogosFromLBE() {
  const all = {};
  for (const cid of CHAMP_IDS) {
    const arr = await fetchCampeonato(cid);
    if (!arr) continue;
    for (const j of arr) {
      const dayName = j.data ? weekdayPTFromDateStr(j.data) : "Indefinido";
      if (!all[dayName]) all[dayName] = [];
      all[dayName].push({
        rodada: j.rodada||"",
        data: j.data||"",
        adversario: (j.leftName && j.leftName.toLowerCase().includes("dynasty")) ? j.rightName : j.leftName,
        campeonato: j.campeonato,
        horario: j.horario||"",
        resultado: j.placar ? `${j.placar} ${j.resultadoEmoji}` : null
      });
    }
  }

  const dados = { dias: [] };
  for (const [dia,jogosArr] of Object.entries(all)) {
    dados.dias.push({ dia: dia.charAt(0).toUpperCase()+dia.slice(1), jogos: jogosArr });
  }

  salvarJogos(dados);
  return dados;
}

// ===== COMMANDS =====
module.exports = {
  nome: "jogos",
  descricao: "Comandos de jogos do Dynasty ES.",

  async updatejogos(message) {
    const aviso = await message.channel.send("🔄 Atualizando jogos da LBE...");
    try {
      const dados = await updateJogosFromLBE();
      await aviso.delete().catch(()=>{});
      const embed = new EmbedBuilder()
        .setTitle("✅ Jogos atualizados")
        .setColor("#7d00ff")
        .setDescription(`Dias atualizados: ${dados.dias.map(d=>d.dia).join(", ")}`);
      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Erro updatejogos:", err);
      await aviso.delete().catch(()=>{});
      return message.reply("❌ Falha ao atualizar jogos da LBE.");
    }
  },

  async jogossem(message) {
    const dados = carregarJogos();
    if (!dados.dias?.length) return message.reply("❌ Nenhum jogo cadastrado na semana.");
    const embed = new EmbedBuilder().setTitle("📆 Jogos da Semana").setColor("#7d00ff");
    let descricao = "";
    for (const dia of dados.dias) {
      descricao += `**${dia.dia}**\n`;
      descricao += dia.jogos.map(j=>`• ${j.adversario} | ${j.campeonato} | ${j.data} - ${j.horario} | ${j.resultado||"❔"}`).join("\n");
      descricao+="\n\n";
    }
    embed.setDescription(descricao.trim());
    return message.channel.send({ embeds: [embed] });
  },

  async jogosprox(message) {
    const dados = carregarJogos();
    if (!dados.dias?.length) return message.reply("❌ Nenhum jogo cadastrado pra próxima semana.");
    const embed = new EmbedBuilder().setTitle("📆 Jogos - Próxima Semana").setColor("#7d00ff");
    let descricao = "";
    for (const dia of dados.dias) {
      descricao += `**${dia.dia} (Próxima Semana)**\n`;
      descricao += dia.jogos.map(j=>`• ${j.adversario} | ${j.campeonato} | ${j.data} - ${j.horario} | ${j.resultado||"❔"}`).join("\n");
      descricao += "\n\n";
    }
    embed.setDescription(descricao.trim());
    return message.channel.send({ embeds: [embed] });
  },

  async jogos(message) { return this.jogossem(message); },

  // ===== MANUAL COMMANDS =====
  async addresult(message,args) {
    if(args.length<3) return message.reply("❌ Use: !addresult <adversário> | <placar> | <vit/der/emp>");
    const [adv,placar,tipo] = args.join(" ").split("|").map(p=>p.trim());
    const dados = carregarJogos();
    let found=false;
    for(const dia of dados.dias)
      for(const jogo of dia.jogos)
        if(jogo.adversario.toLowerCase()===adv.toLowerCase()){
          const emoji=tipo==="vit"?"✅":tipo==="der"?"❌":"⚖️";
          jogo.resultado=`${placar} ${emoji}`; found=true; break;
        }
    if(!found) return message.reply("❌ Jogo não encontrado.");
    salvarJogos(dados);
    return message.reply(`✅ Resultado de **${adv}** atualizado!`);
  },

  async editarjogo(message,args) {
    if(args.length<3) return message.reply("❌ Use: !editarjogo <adversário> | <campo> | <novo valor>");
    const [adv,campo,...valorArr]=args.join(" ").split("|").map(p=>p.trim());
    const valor=valorArr.join(" ");
    const dados=carregarJogos();
    let found=false;
    for(const dia of dados.dias)
      for(const jogo of dia.jogos)
        if(jogo.adversario.toLowerCase()===adv.toLowerCase() && jogo.hasOwnProperty(campo)){
          jogo[campo]=valor; found=true; break;
        }
    if(!found) return message.reply("❌ Jogo não encontrado ou campo inválido.");
    salvarJogos(dados);
    return message.reply(`✅ Jogo de **${adv}** atualizado!`);
  },

  async modificarjogos(message,args) {
    if(args.length<4) return message.reply("❌ Use: !modificarjogos <adv1> | <adv2> | <campo> | <novo valor>");
    const partes=args.join(" ").split("|").map(p=>p.trim());
    const campo=partes[partes.length-2], novoValor=partes[partes.length-1];
    const adversarios=partes.slice(0,partes.length-2);
    const dados=carregarJogos();
    let alterados=0;
    for(const dia of dados.dias)
      for(const jogo of dia.jogos)
        if(adversarios.some(a=>a.toLowerCase()===jogo.adversario.toLowerCase()) && jogo.hasOwnProperty(campo)){
          jogo[campo]=novoValor; alterados++;
        }
    if(alterados===0) return message.reply("❌ Nenhum jogo encontrado ou campo inválido.");
    salvarJogos(dados);
    return message.reply(`✅ Campo **${campo}** atualizado para **${alterados}** jogos.`);
  },

  async limparjogos(message){ salvarJogos({ dias: [] }); return message.reply("🧹 Todos os jogos foram removidos!"); },

  async addjogos(message,args){
    const conteudo=args.join(" ").split("|").map(p=>p.trim());
    if(conteudo.length<6) return message.reply("❌ Use: !addjogos <dia> | <rodada> | <data> | <adversário> | <campeonato> | <horário>");
    const [dia,rodada,data,adv,campeonato,horario]=conteudo;
    const dados=carregarJogos();
    let diaExistente=dados.dias.find(d=>d.dia.toLowerCase()===dia.toLowerCase());
    if(!diaExistente){ diaExistente={dia,jogos:[]}; dados.dias.push(diaExistente); }
    diaExistente.jogos.push({ rodada,data,adversario:adv,campeonato,horario,resultado:null });
    salvarJogos(dados);
    return message.reply(`✅ Jogo **${adv}** adicionado em **${dia}**!`);
  },

  async removerjogo(message,args){
    if(!args.length) return message.reply("❌ Use: !removerjogo <adversário> | <dia (opcional)>");
    const dados=carregarJogos();
    const conteudo=args.join(" ").split("|").map(p=>p.trim());
    const adv=conteudo[0], diaFiltro=conteudo[1]?.toLowerCase();
    let encontrado=false;
    for(const dia of dados.dias){
      if(diaFiltro && dia.dia.toLowerCase()!==diaFiltro) continue;
      const indexJ=dia.jogos.findIndex(j=>j.adversario.toLowerCase()===adv.toLowerCase());
      if(indexJ!==-1){ dia.jogos.splice(indexJ,1); encontrado=true; break; }
    }
    if(!encontrado) return message.reply("❌ Jogo não encontrado.");
    salvarJogos(dados);
    return message.reply(`✅ Jogo de **${adv}** removido!`);
  }
};