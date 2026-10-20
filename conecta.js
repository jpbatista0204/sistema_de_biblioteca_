
const API = "/api";
let token = "";
let acervoAtual = [];

const el = (id) => document.getElementById(id);

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(API + caminho, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers
    }
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.erro || "Não foi possível concluir a operação.");
  }

  return dados;
}

function aviso(texto, erro = false) {
  el("aviso").textContent = texto;
  el("aviso").style.color = erro ? "#a12c2c" : "#21865a";
}

function seguro(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function abrirPagina(nome) {
  document.querySelectorAll(".pagina").forEach((pagina) => {
    pagina.hidden = pagina.id !== `pagina-${nome}`;
  });

  if (nome === "inicio") carregarResumo();
  if (nome === "acervo") carregarAcervo();
  if (nome === "circulacao") carregarMovimentacoes();
  if (nome === "ranking") carregarRanking();
}

document.querySelectorAll("[data-pagina]").forEach((botao) => {
  botao.addEventListener("click", () => abrirPagina(botao.dataset.pagina));
});

el("login").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  el("erro-login").textContent = "";

  try {
    const dados = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: el("email").value.trim(),
        senha: el("senha").value
      })
    });

    token = dados.token;
    el("acesso").hidden = true;
    el("painel").hidden = false;
    el("senha").value = "";
    abrirPagina("inicio");
  } catch (erro) {
    el("erro-login").textContent = erro.message;
  }
});

el("login").addEventListener("reset", () => {
  el("erro-login").textContent = "";
});

el("sair").addEventListener("click", () => {
  token = "";
  acervoAtual = [];
  el("painel").hidden = true;
  el("acesso").hidden = false;
  el("login").reset();
  aviso("");
});

async function carregarResumo() {
  try {
    const dados = await api("/resumo");
    el("qtd-titulos").textContent = dados.titulos;
    el("qtd-abertos").textContent = dados.abertos;
    el("qtd-leitores").textContent = dados.leitores;
  } catch (erro) {
    aviso(erro.message, true);
  }
}

async function carregarAcervo() {
  try {
    acervoAtual = await api(
      `/acervo?busca=${encodeURIComponent(el("filtro").value)}`
    );

    el("corpo-acervo").innerHTML = acervoAtual.map((obra) => `
      <tr>
        <td>${seguro(obra.titulo)}</td>
        <td>${seguro(obra.autor)}</td>
        <td>${seguro(obra.genero)}</td>
        <td>${obra.exemplares_disponiveis}</td>
        <td>
          <button data-editar="${obra.id_acervo}">Editar</button>
          <button class="btn-neutro"
            data-apagar="${obra.id_acervo}">Excluir</button>
        </td>
      </tr>
    `).join("");

    el("corpo-acervo").querySelectorAll("[data-editar]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const obra = acervoAtual.find(
          (item) => item.id_acervo === Number(botao.dataset.editar)
        );

        if (!obra) return;

        el("acervo-id").value = obra.id_acervo;
        el("titulo").value = obra.titulo;
        el("autor").value = obra.autor;
        el("genero").value = obra.genero;
        el("exemplares").value = obra.exemplares_disponiveis;

        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    el("corpo-acervo").querySelectorAll("[data-apagar]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        if (!confirm("Deseja remover este título do acervo?")) return;

        try {
          await api(`/acervo/${botao.dataset.apagar}`, {
            method: "DELETE"
          });

          aviso("Título removido.");
          await carregarAcervo();
          await carregarResumo();
        } catch (erro) {
          aviso(erro.message, true);
        }
      });
    });

    atualizarObras();
  } catch (erro) {
    aviso(erro.message, true);
  }
}

el("filtro").addEventListener("input", carregarAcervo);

el("form-acervo").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const id = el("acervo-id").value;

  const dados = {
    titulo: el("titulo").value.trim(),
    autor: el("autor").value.trim(),
    genero: el("genero").value.trim(),
    exemplares_disponiveis: Number(el("exemplares").value)
  };

  try {
    await api(id ? `/acervo/${id}` : "/acervo", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(dados)
    });

    el("form-acervo").reset();
    el("acervo-id").value = "";
    aviso("Cadastro salvo com sucesso.");
    await carregarAcervo();
    await carregarResumo();
  } catch (erro) {
    aviso(erro.message, true);
  }
});

el("form-acervo").addEventListener("reset", () => {
  el("acervo-id").value = "";
});

async function carregarMovimentacoes() {
  try {
    const [leitores, obras, movimentacoes] = await Promise.all([
      api("/leitores"),
      api("/acervo"),
      api("/movimentacoes")
    ]);

    el("leitor").innerHTML = leitores.map((p) =>
      `<option value="${p.id_leitor}">${seguro(p.nome)}</option>`
    ).join("");

    acervoAtual = obras;
    atualizarObras();

    el("corpo-movimentacoes").innerHTML = movimentacoes.map((m) => `
      <tr>
        <td>${seguro(m.leitor)}</td>
        <td>${seguro(m.titulo)}</td>
        <td>${seguro(m.data_retirada)}</td>
        <td>${seguro(m.data_limite)}</td>
        <td>${seguro(m.data_retorno || "Pendente")}</td>
        <td>
          ${m.data_retorno
            ? "Finalizado"
            : `<button data-retorno="${m.id_movimentacao}">
                 Registrar retorno
               </button>`}
        </td>
      </tr>
    `).join("");

    el("corpo-movimentacoes").querySelectorAll("[data-retorno]")
      .forEach((botao) => {
        botao.addEventListener("click", async () => {
          try {
            await api(`/movimentacoes/${botao.dataset.retorno}/retorno`, {
              method: "POST"
            });

            aviso("Retorno registrado.");
            await carregarMovimentacoes();
            await carregarResumo();
          } catch (erro) {
            aviso(erro.message, true);
          }
        });
      });
  } catch (erro) {
    aviso(erro.message, true);
  }
}

function atualizarObras() {
  el("obra").innerHTML = acervoAtual
    .filter((obra) => obra.exemplares_disponiveis > 0)
    .map((obra) => `
      <option value="${obra.id_acervo}">
        ${seguro(obra.titulo)} — ${obra.exemplares_disponiveis} disponível(is)
      </option>
    `).join("");

  if (!el("obra").options.length) {
    el("obra").innerHTML = '<option value="">Nenhuma obra disponível</option>';
  }
}

el("form-retirada").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  try {
    await api("/movimentacoes", {
      method: "POST",
      body: JSON.stringify({
        id_leitor: Number(el("leitor").value),
        id_acervo: Number(el("obra").value),
        data_retirada: el("retirada").value,
        data_limite: el("limite").value
      })
    });

    aviso("Retirada registrada.");
    await carregarMovimentacoes();
    await carregarResumo();
  } catch (erro) {
    aviso(erro.message, true);
  }
});

async function carregarRanking() {
  try {
    const dados = await api("/relatorios/ranking");

    el("corpo-ranking").innerHTML = dados.map((obra, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${seguro(obra.titulo)}</td>
        <td>${seguro(obra.autor)}</td>
        <td>${obra.total}</td>
      </tr>
    `).join("");
  } catch (erro) {
    aviso(erro.message, true);
  }
}
