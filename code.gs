// ==========================================
// BACKEND DO PAINEL DE LIDERANÇAS (API)
// ==========================================

const CONTATOS_SHEET_ID = '1VGgM5QNBY0SiN3VuVYdQB78joPz9blvdrdHNQj9v73I'; 
const CONTATOS_SHEET_NAME = 'Página1'; 

// Helper para forçar gravação como Texto no Sheets (evita conversão para número)
function txt(val) {
  if (val === null || val === undefined) return "";
  return "'" + val.toString();
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var response = { status: 'error', message: 'Ação desconhecida' };

    if (action === 'createEvent') response = createEvent(data);
    else if (action === 'updateEvent') response = updateEvent(data);
    else if (action === 'updatePresence') response = updatePresence(data);
    else if (action === 'createContact') response = createContact(data);
    else if (action === 'updateContact') response = updateContact(data);
    else if (action === 'generateQRToken') response = generateQRToken(data);
    else if (action === 'deactivateQRToken') response = deactivateQRToken(data);
    else if (action === 'validateKioskAccess') response = validateKioskAccess(data);
    else if (action === 'authorizeKioskMobilizer') response = authorizeKioskMobilizer(data);
    else if (action === 'lookupContact') response = lookupContact(data); 
    else if (action === 'performLogin') response = performLogin(data); 
    else if (action === 'loginUser') response = loginUser(data); 
    else if (action === 'getDictionaries') response = getDictionaries(); 
    else if (action === 'saveUserAccess') response = saveUserAccess(data); 
    else if (action === 'registrarLog') response = registrarLogAtuacao(data);
    else if (action === 'createTask') response = createTask(data);
    else if (action === 'completeTask') response = completeTask(data);
    // MÓDULO DE MATERIAIS
    else if (action === 'registerMaterialTransaction') response = registerMaterialTransaction(data);
    else if (action === 'distributeMaterial') response = distributeMaterial(data);
    else if (action === 'confirmMaterialReceipt') response = confirmMaterialReceipt(data);
    // SEGURANÇA
    else if (action === 'changePassword') response = changePassword(data);

    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// AUTENTICAÇÃO E RBAC DINÂMICO
// ==========================================
function generateHash(senha) {
  if (!senha) return "";
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha.toString());
  var txtHash = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = (rawHash[i] < 0) ? rawHash[i] + 256 : rawHash[i];
    txtHash += ('0' + byteVal.toString(16)).slice(-2);
  }
  return txtHash;
}

function parseCodigoAcesso(codigo, modulos) {
  var parsed = {};
  if (!codigo || !modulos) return parsed;
  codigo = codigo.toString().replace(/'/g, "").trim();
  
  modulos.forEach(function(mod, index) {
    var start = index * 3;
    var key = mod.nome.toString().toLowerCase();
    parsed[key] = codigo.substring(start, start + 3) || "000";
  });
  return parsed;
}

function normalizeAccessCode(userId, currentCode, expectedLength) {
  if (!currentCode) currentCode = "";
  currentCode = currentCode.toString().replace(/'/g, "").trim();
  
  if (currentCode.length < expectedLength) {
    var padding = "";
    for (var i = 0; i < (expectedLength - currentCode.length); i++) {
      padding += "0";
    }
    var newCode = currentCode + padding;
    
    if (userId && userId !== 'LEGADO') {
      try {
        var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
        var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][25] && rows[i][25].toString().replace(/'/g, "").trim().toUpperCase() == userId.toString().toUpperCase()) {
            sheet.getRange(i + 1, 28).setValue(txt(newCode)); 
            break;
          }
        }
      } catch(e) { }
    }
    return newCode;
  }
  return currentCode;
}

function gerarLegadoDeFuncoes(funcoes) {
  var nivelLegado = [];
  if (funcoes['mapa'] === '999') nivelLegado = ['TOTAL'];
  else if (funcoes['mapa'] === '003') nivelLegado = ['CARD'];
  else if (funcoes['mapa'] === '002') nivelLegado = ['ZAP'];
  else if (funcoes['mapa'] === '001') nivelLegado = ['NOME'];

  var modulosLegado = [];
  if (funcoes['mapa'] && funcoes['mapa'] !== '000') modulosLegado.push(1);
  if (funcoes['agenda'] && funcoes['agenda'] !== '000') modulosLegado.push(2);
  if (funcoes['cadastro'] && funcoes['cadastro'] !== '000') modulosLegado.push(3);
  if (funcoes['admin'] && funcoes['admin'] !== '000') modulosLegado.push(4);
  if (funcoes['agenda'] === '003' && !modulosLegado.includes(3)) modulosLegado.push(3);
  return { nivel: nivelLegado, modulos: modulosLegado };
}

function performLogin(data) {
  var key = data.key;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Acessos');
  if (!sheet) return { status: 'error', message: 'Aba Acessos não encontrada.' };
  
  var dataRows = sheet.getDataRange().getValues();
  var dicts = getDictionaries();
  var expectedLen = dicts.modulos.length * 3;
  
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][0] && dataRows[i][0].toString().trim() === key) {
      var eqCodigos = dataRows[i][1] ? dataRows[i][1].toString().trim() : "";
      var codigoAcessoStr = dataRows[i][4] ? dataRows[i][4].toString().trim() : ""; 
      
      var normalizedCode = normalizeAccessCode(key, codigoAcessoStr, expectedLen);
      var parsedFuncoes = parseCodigoAcesso(normalizedCode, dicts.modulos);
      
      var teamsArray = [];
      if(eqCodigos) {
        var eqArr = eqCodigos.match(/.{1,3}/g) || [];
        eqArr.forEach(function(cod) {
          var f = dicts.equipes.find(function(e){return e.cod===cod});
          if(f) teamsArray.push(f.nome.toString().toUpperCase().trim()); 
        });
      }
      if(teamsArray.length === 0) teamsArray = ["TODAS"]; 
      
      var legado = gerarLegadoDeFuncoes(parsedFuncoes);
      
      return { 
        status: 'success', 
        session: {
          key: key, id: 'LEGADO', nome: 'Usuário ' + key, teams: teamsArray, 
          nivel: legado.nivel, modulos: legado.modulos, 
          funcoes: parsedFuncoes,
          mustChangePassword: false 
        }
      };
    }
  }
  return { status: 'error', message: 'Chave inválida.' };
}

function loginUser(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base_Contatos');
  if (!sheet) return { status: 'error', message: 'Base de Contatos não encontrada.' };
  var rows = sheet.getDataRange().getValues();
  var phoneTried = formatPhoneBackend(data.phone);
  var hashTried = generateHash(data.password);
  var dicts = getDictionaries();
  var expectedLen = dicts.modulos.length * 3;
  
  for (var i = 1; i < rows.length; i++) {
    var rowPhone = formatPhoneBackend(rows[i][2]);
    if (rowPhone === phoneTried) {
      var storedHash = rows[i][26] ? rows[i][26].toString().trim() : ""; 
      var rawCodigoAcesso = rows[i][27] ? rows[i][27].toString().trim() : ""; 
      var idContato = rows[i][25] ? rows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : ""; 
      var equipeNomesStr = rows[i][5] ? rows[i][5].toString().trim() : "";
      
      if (storedHash === "") return { status: 'error', message: 'Usuário sem acesso ao sistema.' };
      if (storedHash === hashTried) {
        var normalizedCode = normalizeAccessCode(idContato, rawCodigoAcesso, expectedLen);
        var parsedFuncoes = parseCodigoAcesso(normalizedCode, dicts.modulos);
        
        var legado = gerarLegadoDeFuncoes(parsedFuncoes);
        var teamsArray = equipeNomesStr ? equipeNomesStr.split(',').map(function(t) { return t.trim().toUpperCase(); }).filter(function(t) { return t.length > 0; }) : ["TODAS"];
        
        var isDefaultPass = (hashTried === generateHash("123456"));
        
        return { 
          status: 'success', 
          session: {
            id: idContato, key: 'logado', nome: rows[i][1], teams: teamsArray, 
            nivel: legado.nivel, modulos: legado.modulos, 
            funcoes: parsedFuncoes,
            mustChangePassword: isDefaultPass 
          }
        };
      } else {
        return { status: 'error', message: 'Senha incorreta.' };
      }
    }
  }
  return { status: 'error', message: 'Telefone não encontrado na base.' };
}

function changePassword(data) {
  if (!data.userId || !data.newSenha || data.newSenha.length !== 6) {
    return { status: 'error', message: 'Dados inválidos para troca de senha.' };
  }
  if (data.newSenha === "123456") {
    return { status: 'error', message: 'A nova senha não pode ser igual à senha padrão (123456).' };
  }
  
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  
  var dataRows = sheet.getDataRange().getValues();
  var targetId = data.userId.toString().replace(/'/g, "").trim().toUpperCase();
  
  for (var i = 1; i < dataRows.length; i++) {
    var rowId = dataRows[i][25] ? dataRows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : "";
    if (rowId === targetId) {
      var newHash = generateHash(data.newSenha);
      sheet.getRange(i + 1, 27).setValue(txt(newHash)); 
      registrarLogAtuacao({ userId: data.userId, acao: 'CHANGE_PASS', refId: '', lat: '', lng: '', status: 'OK' });
      return { status: 'success', message: 'Senha atualizada com sucesso!' };
    }
  }
  return { status: 'error', message: 'Usuário não encontrado para atualizar a senha.' };
}

function getDictionaries() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('dicts_acessos_v10');
  if (cached) return JSON.parse(cached);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var extract = function(sheet) {
    if(!sheet) return [];
    var rows = sheet.getDataRange().getValues();
    var arr = [];
    for(var i=1; i<rows.length; i++) {
      if(rows[i][0] !== "" && rows[i][0] != null) {
        arr.push({ cod: rows[i][0].toString().padStart(3,'0'), nome: rows[i][1] });
      }
    }
    return arr;
  };
  
  var extractFuncoesModulos = function(sheet) {
    if(!sheet) return [];
    var rows = sheet.getDataRange().getValues();
    var arr = [];
    for(var i=1; i<rows.length; i++) {
      if(rows[i][0] !== "" && rows[i][0] != null && 
         rows[i][1] !== "" && rows[i][1] != null && 
         rows[i][2] !== "" && rows[i][2] != null) {
        arr.push({ 
          modulo: rows[i][0].toString().trim(), 
          cod: rows[i][1].toString().padStart(3,'0'), 
          nome: rows[i][2].toString().trim() 
        });
      }
    }
    return arr;
  };
  
  var result = {
    status: 'success',
    equipes: extract(ss.getSheetByName('Equipes')),
    niveis: extract(ss.getSheetByName('Niveis')),
    modulos: extract(ss.getSheetByName('Modulos')),
    funcoes_modulos: extractFuncoesModulos(ss.getSheetByName('Funcoes_Modulos')),
    funcoes_contato: extract(ss.getSheetByName('Funcoes')),
    materiais_itens: extract(ss.getSheetByName('Materiais_Itens'))
  };
  cache.put('dicts_acessos_v10', JSON.stringify(result), 21600);
  return result;
}

// [C3-v3] Geração de ID — usada EXCLUSIVAMENTE pelo saveUserAccess (fluxo Admin).
// Valida formato antes de parsear (4 a 8 caracteres alfanuméricos) — imune a
// resíduos inválidos na coluna Z.
function gerarNovoIdContato(sheet) {
  var lastRow = sheet.getLastRow();
  var maxIdNum = 0;
  if (lastRow > 1) {
    var values = sheet.getRange(2, 26, lastRow - 1, 1).getValues();
    var validPattern = /^[0-9A-Z]{4,8}$/;
    for (var i = 0; i < values.length; i++) {
      var id = values[i][0] ? values[i][0].toString().replace(/'/g, "").trim().toUpperCase() : "";
      if (id !== "" && validPattern.test(id)) {
        var num = parseInt(id, 36);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    }
  }
  return (maxIdNum + 1).toString(36).toUpperCase().padStart(4, '0');
}

// [C3-v3] saveUserAccess com dois caminhos (ID / telefone).
function saveUserAccess(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  var rows = sheet.getDataRange().getValues();
  
  var targetId = data.userId ? data.userId.toString().replace(/'/g, "").trim().toUpperCase() : "";
  var newCodigo = data.codigoAcesso;
  var equipesCodigosStr = data.equipes || "";
  
  var dicts = getDictionaries();
  var equipesNomesArr = [];
  if (equipesCodigosStr) {
    var codigosArr = equipesCodigosStr.match(/.{1,3}/g) || [];
    codigosArr.forEach(function(cod) {
      var f = dicts.equipes.find(function(e) { return e.cod === cod; });
      if (f) equipesNomesArr.push(f.nome.toString().trim());
    });
  }
  var equipesNomesStr = equipesNomesArr.join(', ');
  
  for (var i = 1; i < rows.length; i++) {
    var rowId = rows[i][25] ? rows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : "";
    
    var matchRow = false;
    var generatedId = null;
    
    if (targetId !== "" && rowId === targetId) {
      matchRow = true;
    } else if (targetId === "" && data.userPhone) {
      var rowPhone = formatPhoneBackend(rows[i][2]);
      if (rowPhone === formatPhoneBackend(data.userPhone)) {
        matchRow = true;
        if (rowId === "") {
          generatedId = gerarNovoIdContato(sheet);
          sheet.getRange(i + 1, 26).setValue(txt(generatedId));
        }
      }
    }
    
    if (matchRow) { 
      sheet.getRange(i + 1, 28).setValue(txt(newCodigo)); 
      sheet.getRange(i + 1, 6).setValue(equipesNomesStr);
      if (data.senha && data.senha.toString().trim() !== "") sheet.getRange(i + 1, 27).setValue(txt(generateHash(data.senha))); 
      
      var response = { status: 'success', message: 'Acesso atualizado com sucesso!' };
      if (generatedId) {
        response.message = 'Acesso criado com sucesso! ID gerado: ' + generatedId;
        response.newId = generatedId;
      }
      return response;
    }
  }
  return { status: 'error', message: 'Contato não encontrado com o ID: ' + (targetId || '(busca por telefone falhou)') };
}

function registrarLogAtuacao(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Logs_Atividades');
    if (!sheet) return { status: 'error', message: 'Aba Logs_Atividades não encontrada.' };
    sheet.appendRow([new Date(), txt(payload.userId || 'SYSTEM'), txt(payload.acao || 'UNKNOWN'), txt(payload.refId || ''), payload.lat || '', payload.lng || '', payload.status || 'OK']);
    return { status: 'success', message: 'Log registrado.' };
  } catch (e) {
    return { status: 'error', message: 'Erro ao registrar log: ' + e.toString() };
  }
}

// ==========================================
// EVENTOS 
// ==========================================

// [A3] Validação de estrutura:
// 1. Um contato só pode figurar UMA VEZ na árvore de um evento (1 check-in por
//    usuário/evento — modelo A2);
// 2. [v9] TODO nó precisa de ID válido — participante de evento é, por definição
//    do modelo, contato com acesso ao painel (contatos-sem-ID são base de mapa;
//    nós id-vazio geram campo em branco na tela, nunca notificam e nunca fazem
//    check-in — lixo em todas as dimensões).
// Retorna { valida, motivo: 'duplicado'|'sem_id'|null, id } — id = o problemático.
function validarEstruturaUnica(hierarquiaJson) {
  var arvore;
  try {
    arvore = JSON.parse(hierarquiaJson || "[]");
  } catch (e) {
    return { valida: false, motivo: 'sem_id', id: null }; // JSON corrompido trata como inválido
  }
  
  var todos = [];
  arvore.forEach(function(node) { todos = todos.concat(extractIdsFromJson(node)); });
  
  // [v9] Nó com ID vazio: extractIdsFromJson ignora ids vazios — varre a árvore
  // manualmente para detectá-los
  var temIdVazio = false;
  var varrer = function(nodes) {
    (nodes || []).forEach(function(n) {
      if (!n || !n.id || n.id.toString().trim() === "") { temIdVazio = true; return; }
      if (n.filhos && n.filhos.length > 0) varrer(n.filhos);
    });
  };
  varrer(arvore);
  if (temIdVazio) return { valida: false, motivo: 'sem_id', id: null };
  
  // [A3] Duplicata
  var seen = {};
  for (var i = 0; i < todos.length; i++) {
    if (seen[todos[i]]) return { valida: false, motivo: 'duplicado', id: todos[i] };
    seen[todos[i]] = true;
  }
  return { valida: true, motivo: null, id: null };
}

function createEvent(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };

  // [A3/v9] Valida estrutura (duplicatas + IDs vazios)
  var validacao = validarEstruturaUnica(data.hierarquia || "[]");
  if (!validacao.valida) {
    if (validacao.motivo === 'sem_id') {
      return { status: 'error', message: 'Estrutura inválida: existe participante sem ID na árvore — conceda o acesso pelo Admin antes de adicionar o contato.' };
    }
    return { status: 'error', message: 'Estrutura inválida: o contato ' + validacao.id + ' aparece mais de uma vez no evento. Cada contato só pode figurar uma vez.' };
  }

  var lastRow = sheet.getLastRow();
  var idCol = sheet.getRange(2, 1, lastRow > 1 ? lastRow - 1 : 1, 1).getValues();
  var maxIdNum = 0;
  idCol.forEach(function(row) {
    if (row[0] && row[0].toString().startsWith("EVT-")) {
      var num = parseInt(row[0].toString().replace("EVT-", ""), 10);
      if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
    }
  });
  var newId = "EVT-" + (maxIdNum + 1).toString().padStart(4, '0');

  var ev = data.eventData;
  sheet.appendRow([
    txt(newId), ev.nome || "", ev.data || "", ev.tipo || "", ev.bairro || "", 
    data.hierarquia || "[]", "", ev.descricao || "", "Pendente", ""
  ]);

  return { status: 'success', message: 'Evento criado com sucesso!', newId: newId };
}

function updateEvent(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };

  // [A3/v9] Valida estrutura (duplicatas + IDs vazios)
  var validacao = validarEstruturaUnica(data.hierarquia || "[]");
  if (!validacao.valida) {
    if (validacao.motivo === 'sem_id') {
      return { status: 'error', message: 'Estrutura inválida: existe participante sem ID na árvore — conceda o acesso pelo Admin antes de adicionar o contato.' };
    }
    return { status: 'error', message: 'Estrutura inválida: o contato ' + validacao.id + ' aparece mais de uma vez no evento. Cada contato só pode figurar uma vez.' };
  }

  var dataRows = sheet.getDataRange().getValues();
  var eventId = data.eventId;
  var ev = data.eventData;
  var hierarquiaJson = data.hierarquia || "[]";
  var updated = false;
  var newRows = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    if (i === 0) { newRows.push(dataRows[i]); continue; }
    if (dataRows[i][0].toString() == eventId.toString()) { updated = true; continue; }
    newRows.push(dataRows[i]); 
  }
  
  if (updated) {
    newRows.push([
      txt(eventId), ev.nome || "", ev.data || "", ev.tipo || "", ev.bairro || "",            
      hierarquiaJson, "", ev.descricao || "", "Pendente", ""                         
    ]);
    sheet.clearContents();
    sheet.getRange(1, 1, newRows.length, newRows[0].length).setValues(newRows);
    return { status: 'success', message: 'Evento atualizado!' };
  }
  return { status: 'error', message: 'Evento não encontrado.' };
}

// [E1-a / Item 2.1] Presença com dedup idempotente + guard de ID (Decisão D-3v3):
// participante de presença é membro das equipes de trabalho — exige ID válido.
// Dedup pelo triplo (evento, organizador, participante); LockService do doPost
// garante ausência de janela de race entre verificação e gravação.
function updatePresence(data) {
  var presencaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Presencas");
  if (!presencaSheet) return { status: 'error', message: 'Aba Presencas não encontrada.' };

  var eventId = (data.eventId || "").toString().replace(/'/g, "").trim();
  var mobId = (data.mobId || "").toString().replace(/'/g, "").trim().toUpperCase();
  var presenceId = (data.presence || "").toString().replace(/'/g, "").trim().toUpperCase();

  if (!eventId || !mobId || !presenceId) {
    return { status: 'error', message: 'Dados de presença incompletos — o participante precisa ser um contato com ID (conceda o acesso pelo Admin).' };
  }

  var dataRows = presencaSheet.getDataRange().getValues();
  for (var i = 1; i < dataRows.length; i++) {
    var rowEvId = dataRows[i][1] ? dataRows[i][1].toString().replace(/'/g, "").trim() : "";
    var rowMobId = dataRows[i][2] ? dataRows[i][2].toString().replace(/'/g, "").trim().toUpperCase() : "";
    var rowPartId = dataRows[i][3] ? dataRows[i][3].toString().replace(/'/g, "").trim().toUpperCase() : "";
    if (rowEvId === eventId && rowMobId === mobId && rowPartId === presenceId) {
      return { status: 'success', message: 'Presença já registrada para este participante.', duplicate: true };
    }
  }

  presencaSheet.appendRow([
    new Date(), txt(data.eventId || ""), txt(data.mobId || ""), txt(data.presence || ""), data.lat || "", data.lng || ""
  ]);

  registrarLogAtuacao({ userId: data.mobId || 'unknown', acao: 'CHECKIN_PRESENCA', refId: data.eventId + '_' + data.presence, lat: data.lat || '', lng: data.lng || '', status: 'OK' });
  return { status: 'success', message: 'Presença registrada no log!' };
}

// [E1-c] Limpeza das duplicatas JÁ existentes na aba Presencas. Execução manual.
function dedupPresencas() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Presencas");
  if (!sheet) { Logger.log("Aba Presencas não encontrada."); return; }

  var dataRows = sheet.getDataRange().getValues();
  var seen = {};
  var rowsToDelete = [];

  for (var i = 1; i < dataRows.length; i++) {
    var key = [dataRows[i][1], dataRows[i][2], dataRows[i][3]].map(function(v) {
      return v ? v.toString().replace(/'/g, "").trim().toUpperCase() : "";
    }).join("|");

    if (seen[key]) {
      rowsToDelete.push(i + 1);
    } else {
      seen[key] = true;
    }
  }

  rowsToDelete.reverse().forEach(function(rowNum) {
    sheet.deleteRow(rowNum);
  });

  Logger.log("dedupPresencas concluído. Duplicatas removidas: " + rowsToDelete.length);
}

// [A1] Correção de base: regrava telefones não-texto como texto (txt). Execução
// manual UMA vez. Idempotente.
function fixTelefoneTexto() {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) { Logger.log("Aba não encontrada."); return; }
  
  var dataRows = sheet.getDataRange().getValues();
  var fixed = 0;
  for (var i = 1; i < dataRows.length; i++) {
    var val = dataRows[i][2];
    if (val === "" || val === null) continue;
    if (typeof val === 'number') {
      sheet.getRange(i + 1, 3).setValue(txt(formatPhoneBackend(val)));
      fixed++;
    }
  }
  Logger.log("fixTelefoneTexto concluído. Telefones convertidos para texto: " + fixed);
}

// ==========================================
// TAREFAS AVULSAS 
// ==========================================
function createTask(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tarefas");
  if (!sheet) return { status: 'error', message: 'Aba Tarefas não encontrada.' };

  var lastRow = sheet.getLastRow();
  var maxIdNum = 0;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); 
    idCol.forEach(function(row) {
      if (row[0] && row[0].toString().startsWith("TASK-")) {
        var num = parseInt(row[0].toString().replace("TASK-", ""), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
  }
  var newId = "TASK-" + (maxIdNum + 1).toString().padStart(4, '0');

  sheet.appendRow([
    new Date(), txt(newId), txt(data.userId || ""), data.titulo || "Tarefa Sem Título", 
    data.descricao || "", data.dataLimite || "", "Pendente", "", txt(data.createdBy || "")
  ]);

  registrarLogAtuacao({ userId: data.createdBy || 'unknown', acao: 'CREATE_TASK', refId: newId, lat: '', lng: '', status: 'OK' });
  return { status: 'success', message: 'Tarefa criada com sucesso!', newId: newId };
}

function completeTask(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tarefas");
  if (!sheet) return { status: 'error', message: 'Aba Tarefas não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var taskId = data.taskId;
  var updated = false;
  
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][1].toString().replace(/'/g, "") == taskId.toString()) { 
      sheet.getRange(i + 1, 7).setValue("Concluído"); 
      sheet.getRange(i + 1, 8).setValue(data.relato || ""); 
      updated = true; break;
    }
  }
  if (updated) {
    registrarLogAtuacao({ userId: data.userId || 'unknown', acao: 'COMPLETE_TASK', refId: taskId, lat: data.lat || '', lng: data.lng || '', status: 'OK' });
    return { status: 'success', message: 'Tarefa concluída!' };
  }
  return { status: 'error', message: 'Tarefa não encontrada.' };
}

// ==========================================
// CONTROLE DE MATERIAIS 
// ==========================================
function registerMaterialTransaction(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Materiais_Movimentacao");
  if (!sheet) return { status: 'error', message: 'Aba Materiais_Movimentacao não encontrada.' };

  var lastRow = sheet.getLastRow();
  var maxIdNum = 0;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); 
    idCol.forEach(function(row) {
      if (row[0] && row[0].toString().startsWith("MAT-")) {
        var num = parseInt(row[0].toString().replace("MAT-", ""), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
  }
  var newId = "MAT-" + (maxIdNum + 1).toString().padStart(4, '0');
  
  var movDate = data.dataMov ? new Date(data.dataMov) : new Date();

  sheet.appendRow([
    movDate, txt(newId), txt(data.tipoMov || "ENTRADA"), txt(data.item || ""), parseInt(data.quantidade || 0), 
    txt(data.idOrigemDestino || ""), txt(data.idResponsavel || ""), txt(data.refId || ""), txt(data.status || "Concluído")
  ]);

  registrarLogAtuacao({ userId: data.idResponsavel || 'unknown', acao: 'MAT_' + (data.tipoMov || 'ENTRY'), refId: newId, lat: '', lng: '', status: 'OK' });
  return { status: 'success', message: 'Movimentação registrada com sucesso!', newId: newId };
}

function distributeMaterial(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Materiais_Movimentacao");
  if (!sheet) return { status: 'error', message: 'Aba Materiais_Movimentacao não encontrada.' };

  var lastRow = sheet.getLastRow();
  var maxIdNum = 0;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    idCol.forEach(function(row) {
      if (row[0] && row[0].toString().startsWith("MAT-")) {
        var num = parseInt(row[0].toString().replace("MAT-", ""), 10);
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
  }
  var newId = "MAT-" + (maxIdNum + 1).toString().padStart(4, '0');
  
  var movDate = data.dataMov ? new Date(data.dataMov) : new Date();

  sheet.appendRow([
    movDate, txt(newId), "DISTRIBUICAO", txt(data.item || ""), parseInt(data.quantidade || 0), 
    txt(data.idReceptor || ""), txt(data.idResponsavel || ""), txt(data.refId || ""), "Pendente_Recebimento"
  ]);

  registrarLogAtuacao({ userId: data.idResponsavel || 'unknown', acao: 'MAT_DISTRIB', refId: newId, lat: '', lng: '', status: 'OK' });
  return { status: 'success', message: 'Material distribuído (Aguardando Recebimento)!', newId: newId };
}

function confirmMaterialReceipt(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Materiais_Movimentacao");
  if (!sheet) return { status: 'error', message: 'Aba Materiais_Movimentacao não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var transId = data.transId;
  var updated = false;
  
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][1].toString().replace(/'/g, "") == transId.toString()) { 
      var rowReceptorId = dataRows[i][5].toString().replace(/'/g, "").trim().toUpperCase();
      var loggedUserId = data.userId.toString().trim().toUpperCase();
      if (rowReceptorId === loggedUserId) {
          sheet.getRange(i + 1, 9).setValue("Recebido"); 
          updated = true; break;
      }
    }
  }
  if (updated) {
    registrarLogAtuacao({ userId: data.userId || 'unknown', acao: 'MAT_RECEIPT', refId: transId, lat: '', lng: '', status: 'OK' });
    return { status: 'success', message: 'Recebimento confirmado!' };
  }
  return { status: 'error', message: 'Transação não encontrada ou não pertence a este usuário.' };
}

// ==========================================
// CONTATOS E LOOKUP
// ==========================================
function formatPhoneBackend(rawFone) {
  if (!rawFone) return "";
  var cleanFone = rawFone.toString().trim().replace(/\D/g, '');
  if (cleanFone.startsWith('55') && cleanFone.length >= 12) cleanFone = cleanFone.substring(2);
  if (cleanFone.length === 8 || cleanFone.length === 9) cleanFone = '21' + cleanFone;
  return cleanFone;
}

// [A1] Cadastro SEM ID + telefone como TEXTO (txt). Células apenas A–G (fix 4.2:
// evita linhas fantasma no getLastRow). ID nasce exclusivamente no saveUserAccess.
function createContact(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  
  sheet.appendRow([
    data.bairro || "",
    data.nome || "",
    txt(formatPhoneBackend(data.telefone)),          // [A1] telefone como texto puro
    data.ref || "",
    data.funcao || "MOBILIZADOR(A)",
    data.equipe || "",
    new Date()
  ]);
  
  registrarLogAtuacao({ userId: data.userId || 'unknown', acao: 'CAD_CONTATO', refId: 'SEM_ID', lat: data.lat || '', lng: data.lng || '', status: 'OK' });
  return { status: 'success', message: 'Contato criado (sem ID — será gerado quando receber acesso).' };
}

function updateContact(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var targetId = data.id ? data.id.toString().replace(/'/g, "").trim().toUpperCase() : "";
  
  for (var i = 1; i < dataRows.length; i++) {
    var rowId = dataRows[i][25] ? dataRows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : "";
    var matchRow = false;
    
    if (targetId !== "" && rowId === targetId) {
      matchRow = true;
    } else if (targetId === "" && data.telefone) {
      var rowPhone = formatPhoneBackend(dataRows[i][2]);
      if (rowPhone === formatPhoneBackend(data.telefone)) {
        matchRow = true;
      }
    }
    
    if (matchRow) {
      sheet.getRange(i + 1, 1).setValue(data.bairro); sheet.getRange(i + 1, 2).setValue(data.nome);   
      sheet.getRange(i + 1, 3).setValue(txt(formatPhoneBackend(data.telefone)));  // [A1] telefone como texto
      sheet.getRange(i + 1, 4).setValue(data.ref);       
      sheet.getRange(i + 1, 5).setValue(data.funcao); sheet.getRange(i + 1, 6).setValue(data.equipe);    
      return { status: 'success', message: 'Contato atualizado!' };
    }
  }
  return { status: 'error', message: targetId === "" ? 'Contato não encontrado para atualização — verifique o telefone informado.' : 'Contato não encontrado.' };
}

// Unificação de Busca (Nome ou Telefone) - Retorna Array de Contatos
function lookupContact(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base_Contatos');
  if (!sheet) return { status: 'error', message: 'Aba Base_Contatos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var dicts = getDictionaries();
  var expectedLen = dicts.modulos.length * 3;
  
  var term = data.term ? data.term.toString().trim() : "";
  var type = data.type || 'phone';
  var results = [];
  
  for (var i = 1; i < dataRows.length; i++) {
    var match = false;
    if (type === 'phone') {
      var formattedInput = formatPhoneBackend(term);
      if (formatPhoneBackend(dataRows[i][2]) === formattedInput) match = true;
    } else {
      var rowName = dataRows[i][1] ? dataRows[i][1].toString().trim().toUpperCase() : "";
      if (rowName.includes(term.toUpperCase())) match = true;
    }
    
    if (match) {
      var rawId = dataRows[i][25] ? dataRows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : "";
      var rawCodigo = dataRows[i][27] ? dataRows[i][27].toString().replace(/'/g, "").trim() : "";
      var normCodigo = normalizeAccessCode(rawId, rawCodigo, expectedLen);
      
      results.push({
        id: rawId, 
        nome: dataRows[i][1] ? dataRows[i][1].toString().trim() : "", 
        telefone: dataRows[i][2] ? dataRows[i][2].toString().trim() : "",
        bairro: dataRows[i][0] ? dataRows[i][0].toString().trim() : "", 
        ref: dataRows[i][3] ? dataRows[i][3].toString().trim() : "", 
        equipe: dataRows[i][5] ? dataRows[i][5].toString().trim() : "",
        funcao: dataRows[i][4] ? dataRows[i][4].toString().trim() : "",
        codigoAcesso: normCodigo, 
        hasSenha: dataRows[i][26] ? dataRows[i][26].toString().trim() !== "" : false
      });
      
      if (results.length >= 10) break;
    }
  }
  return { status: 'success', contacts: results }; 
}

// ==========================================
// QR CODE E KIOSK 
// ==========================================
function generateQRToken(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var token = Math.random().toString(36).substring(2, 10); 
  var updated = false;
  for (var i = 1; i < dataRows.length; i++) { 
    if (dataRows[i][0].toString() == data.eventId.toString()) { 
      sheet.getRange(i + 1, 10).setValue(token); updated = true; 
    } 
  }
  return updated ? { status: 'success', token: token } : { status: 'error', message: 'Evento não encontrado.' };
}

function deactivateQRToken(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var updated = false;
  for (var i = 1; i < dataRows.length; i++) { 
    if (dataRows[i][0].toString() == data.eventId.toString()) { 
      sheet.getRange(i + 1, 10).setValue(''); updated = true; 
    } 
  }
  return updated ? { status: 'success', message: 'QR Code desativado.' } : { status: 'error', message: 'Evento não encontrado.' };
}

function validateKioskAccess(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var eventName = "", eventDate = "", tokenValid = false;
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][0].toString() == data.eventId.toString()) {
      eventName = dataRows[i][1]; eventDate = dataRows[i][2];
      if (dataRows[i][9] === data.token) { tokenValid = true; }
    }
  }
  return tokenValid ? { status: 'success', eventName: eventName, eventDate: eventDate } : { status: 'error', message: 'QR Code inválido ou desativado.' };
}

function extractIdsFromJson(node) {
  var ids = [];
  if (node.id) ids.push(node.id.toString().trim().toUpperCase());
  if (node.filhos && Array.isArray(node.filhos)) {
    node.filhos.forEach(function(child) { ids = ids.concat(extractIdsFromJson(child)); });
  }
  return ids;
}

function authorizeKioskMobilizer(data) {
  var eventSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!eventSheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var eventDataRows = eventSheet.getDataRange().getValues();
  var eventId = data.eventId, token = data.token, authorizedMobId = null, tokenValid = false, estruturaJson = "[]";
  
  for (var i = 1; i < eventDataRows.length; i++) {
    if (eventDataRows[i][0].toString() == eventId.toString() && eventDataRows[i][9] === token) { 
      tokenValid = true; estruturaJson = eventDataRows[i][5] ? eventDataRows[i][5].toString() : "[]"; break;
    }
  }
  if (!tokenValid) return { status: 'error', message: 'Token inválido.' };
  
  var arvore;
  try { arvore = JSON.parse(estruturaJson); } catch (e) { return { status: 'error', message: 'Estrutura hierárquica do evento corrompida.' }; }
  
  var allHierIds = [];
  arvore.forEach(function(node) { allHierIds = allHierIds.concat(extractIdsFromJson(node)); });
  if (allHierIds.length === 0) return { status: 'error', message: 'Evento sem organizadores definidos.' };
  
  var contatosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base_Contatos');
  if (!contatosSheet) return { status: 'error', message: 'Base de Contatos não encontrada.' };
  var contactRows = contatosSheet.getDataRange().getValues();
  var formattedInput = formatPhoneBackend(data.phone);
  
  for (var j = 1; j < contactRows.length; j++) {
    var rowId = contactRows[j][25] ? contactRows[j][25].toString().replace(/'/g, "").trim().toUpperCase() : ""; 
    if (formatPhoneBackend(contactRows[j][2]) === formattedInput && rowId) {
      if (allHierIds.indexOf(rowId) !== -1) { authorizedMobId = rowId; break; }
    }
  }
  return authorizedMobId ? { status: 'success', mobId: authorizedMobId } : { status: 'error', message: 'Telefone não autorizado para este evento.' };
}