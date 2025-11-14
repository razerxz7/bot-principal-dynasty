// ==========================
// JOGOS.JS - DYNASTY ES (Manual + Próxima Semana)
// ==========================

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const caminhoJogos = path.join(__dirname, "../jogos.json");

// ===== UTIL =====
function carregarJogos() {
  if (!fs.existsSync(caminhoJogos)) fs.writeFileSync(caminhoJogos, JSON.stringify({ dias: [] }, null, 2));
  try { return JSON.parse(fs.readFileSync(caminhoJogos, "utf8")); } 
  catch { return { dias: [] }; }
}
function salvarJogos(dados) { fs.writeFileSync(caminhoJogos, JSON.stringify(dados, null, 2)); }

// ===== COMMANDS =====
module.exports = {
  nome: "jogos",
  descricao: "Comandos de jogos do Dynasty ES.",

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

  async addresult(message,args){
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

  async editarjogo(message,args){
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

  async modificarjogos(message,args){
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

  async limparjogos(message){ 
    salvarJogos({ dias: [] }); 
    return message.reply("🧹 Todos os jogos foram removidos!"); 
  },

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