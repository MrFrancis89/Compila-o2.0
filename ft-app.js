// ft-app.js — v2.0
import { initFirebase, fbIsAvailable } from './ft-firebase.js';
import { sincronizarLocalParaFirebase } from './ft-storage.js';
import { initModalOverlay, setLoading, toast, debounce } from './ft-ui.js';
import { initIngredientes, renderIngredientes, abrirFormIngrediente } from './ft-ingredientes.js';
import { initReceitas,     renderReceitas,     abrirFormReceita     } from './ft-receitas.js';
import { initSimulador,    renderSimulador                          } from './ft-custos.js';
import { renderDashboard                                            } from './ft-dashboard.js';
import { renderExportacao                                           } from './ft-exportacao.js';

let _aba = 'ing';

// ─── Boot ─────────────────────────────────────────────────────────
async function init() {
  setLoading(true);
  const app = document.getElementById('ft-app');

  try {
    // Firebase com timeout de 4s
    const fbOk = await Promise.race([
      initFirebase(),
      new Promise(r => setTimeout(()=>r(false), 4000)),
    ]);
    if (fbOk) {
      await sincronizarLocalParaFirebase();
      _setBadge(true);
    } else {
      _setBadge(false);
    }

    await initIngredientes();
    await initReceitas();
    await initSimulador();
    _navTo('ing');
  } catch(e) {
    console.error('[ft-app] init error:', e);
    toast('Erro ao inicializar. Modo offline ativo.','aviso');
    _navTo('ing'); // garantir que o app aparece mesmo com erro
  }

  setLoading(false);
  app?.classList.remove('hidden');
}

// ─── Navegação ────────────────────────────────────────────────────
function _navTo(aba) {
  _aba = aba;

  document.querySelectorAll('.ft-section').forEach(s =>
    s.classList.toggle('active', s.id===`ft-sec-${aba}`));

  document.querySelectorAll('.ft-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab===aba));

  // FAB: visível apenas em ing e rec
  const fab = document.getElementById('ft-fab');
  if (fab) fab.style.display = ['ing','rec'].includes(aba) ? 'flex' : 'none';

  switch(aba) {
    case 'ing':  renderIngredientes(); break;
    case 'rec':  renderReceitas();     break;
    case 'sim':  renderSimulador();    break;
    case 'dash': renderDashboard();    break;
    case 'exp':  renderExportacao();   break;
  }
}

// ─── FAB ──────────────────────────────────────────────────────────
function _fab() {
  if (_aba==='ing') abrirFormIngrediente();
  if (_aba==='rec') abrirFormReceita();
}

// ─── Badge Firebase ───────────────────────────────────────────────
function _setBadge(online) {
  const b = document.getElementById('ft-sync-btn');
  if (!b) return;
  // Importar ico dinamicamente para não criar dependência circular no topo
  import('./ft-icons.js').then(({ ico }) => {
    b.innerHTML = online ? ico.cloud : ico.cloudOff;
    b.title = online ? 'Firebase conectado — clique para sincronizar' : 'Modo offline (localStorage)';
    b.classList.toggle('online', online);
  });
}

// ─── Listeners ────────────────────────────────────────────────────
function _listeners() {
  document.querySelectorAll('.ft-nav-btn').forEach(b =>
    b.addEventListener('click', () => _navTo(b.dataset.tab)));

  document.getElementById('ft-fab')?.addEventListener('click', _fab);

  const busca1 = document.getElementById('ft-busca-ing');
  const busca2 = document.getElementById('ft-busca-rec');

  if (busca1) busca1.addEventListener('input', debounce(e=>renderIngredientes(e.target.value)));
  if (busca2) busca2.addEventListener('input', debounce(e=>renderReceitas(e.target.value)));

  document.getElementById('ft-sync-btn')?.addEventListener('click', async () => {
    if (!fbIsAvailable()) { toast('Firebase não configurado.','aviso'); return; }
    setLoading(true);
    await sincronizarLocalParaFirebase();
    setLoading(false);
    toast('Dados sincronizados!','sucesso');
  });

  // Re-render quando receitas ou ingredientes mudarem
  document.addEventListener('ft:recs-changed', () => {
    if (_aba==='sim')  renderSimulador();
    if (_aba==='dash') renderDashboard();
  });
  document.addEventListener('ft:ings-changed', () => {
    if (_aba==='dash') renderDashboard();
  });

  initModalOverlay();
}

document.addEventListener('DOMContentLoaded', () => { _listeners(); init(); });
