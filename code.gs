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
    else if (action === 'lookupContactByPhone') response = lookupContactByPhone(data);
    else if (action === 'performLogin') response = performLogin(data); 
    else if (action === 'loginUser') response = loginUser(data); 
    else if (action === 'getDictionaries') response = getDictionaries(); 
    else if (action === 'saveUserAccess') response = saveUserAccess(data); 
    else if (action === 'registrarLog') response = registrarLogAtuacao(data);

    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// AUTENTICAÇÃO E RBAC
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

function parseCodigoAcesso(codigo) {
  if (!codigo || codigo.length < 12) return { mapa: '000', agenda: '000', cadastro: '000', admin: '000' };
  return {
    mapa: codigo.substring(0, 3),
    agenda: codigo.substring(3, 6),
    cadastro: codigo.substring(6, 9),
    admin: codigo.substring(9, 12)
  };
}

function gerarLegadoDeFuncoes(funcoes) {
  var nivelLegado = [];
  if (funcoes.mapa === '999') nivelLegado = ['TOTAL'];
  else if (funcoes.mapa === '003') nivelLegado = ['CARD'];
  else if (funcoes.mapa === '002') nivelLegado = ['ZAP'];
  else if (funcoes.mapa === '001') nivelLegado = ['NOME'];

  var modulosLegado = [];
  if (funcoes.mapa !== '000') modulosLegado.push(1);
  if (funcoes.agenda !== '000') modulosLegado.push(2);
  if (funcoes.cadastro !== '000') modulosLegado.push(3);
  if (funcoes.admin !== '000') modulosLegado.push(4);
  if (funcoes.agenda === '003' && !modulosLegado.includes(3)) modulosLegado.push(3);
  return { nivel: nivelLegado, modulos: modulosLegado };
}

function performLogin(data) {
  var key = data.key;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Acessos');
  if (!sheet) return { status: 'error', message: 'Aba Acessos não encontrada.' };
  
  var dataRows = sheet.getDataRange().getValues();
  var dicts = getDictionaries();
  
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][0] && dataRows[i][0].toString().trim() === key) {
      var eqCodigos = dataRows[i][1] ? dataRows[i][1].toString().trim() : "";
      var niCodigos = dataRows[i][2] ? dataRows[i][2].toString().trim().toUpperCase() : "";
      var moCodigos = dataRows[i][3] ? dataRows[i][3].toString().trim() : "1";
      var codigoAcessoStr = dataRows[i][4] ? dataRows[i][4].toString().trim() : "";
      
      var parsedFuncoes;
      if (codigoAcessoStr.length === 12) {
        parsedFuncoes = parseCodigoAcesso(codigoAcessoStr);
      } else {
        var mapLvl = '000';
        if (niCodigos.includes('TOTAL') || niCodigos.includes('000')) mapLvl = '999';
        else if (niCodigos.includes('CARD') || niCodigos.includes('003')) mapLvl = '003';
        else if (niCodigos.includes('ZAP') || niCodigos.includes('002')) mapLvl = '002';
        else if (niCodigos.includes('NOME') || niCodigos.includes('001')) mapLvl = '001';
        
        var agendaLvl = '000';
        if (moCodigos.includes('2') || moCodigos.includes('3')) agendaLvl = '003';
        
        var cadastroLvl = '000';
        if (mapLvl === '999' || mapLvl === '003') cadastroLvl = '002';
        
        var adminLvl = '000';
        if (mapLvl === '999') adminLvl = '999';
        
        parsedFuncoes = { mapa: mapLvl, agenda: agendaLvl, cadastro: cadastroLvl, admin: adminLvl };
      }
      
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
          funcoes: parsedFuncoes 
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
  
  for (var i = 1; i < rows.length; i++) {
    var rowPhone = formatPhoneBackend(rows[i][2]);
    if (rowPhone === phoneTried) {
      var storedHash = rows[i][26] ? rows[i][26].toString().trim() : ""; 
      var codigoAcesso = rows[i][27] ? rows[i][27].toString().trim() : ""; 
      var idContato = rows[i][25] ? rows[i][25].toString().trim().toUpperCase() : ""; 
      var equipeNomesStr = rows[i][5] ? rows[i][5].toString().trim() : "";
      
      if (storedHash === "") return { status: 'error', message: 'Usuário sem acesso ao sistema.' };
      if (storedHash === hashTried) {
        var parsedFuncoes = parseCodigoAcesso(codigoAcesso);
        var legado = gerarLegadoDeFuncoes(parsedFuncoes);
        
        var teamsArray = equipeNomesStr ? equipeNomesStr.split(',').map(function(t) { return t.trim().toUpperCase(); }).filter(function(t) { return t.length > 0; }) : ["TODAS"];
        
        return { 
          status: 'success', 
          session: {
            id: idContato, key: 'logado', nome: rows[i][1], teams: teamsArray, 
            nivel: legado.nivel, modulos: legado.modulos, 
            funcoes: parsedFuncoes 
          }
        };
      } else {
        return { status: 'error', message: 'Senha incorreta.' };
      }
    }
  }
  return { status: 'error', message: 'Telefone não encontrado na base.' };
}

function getDictionaries() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('dicts_acessos_v7');
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
    funcoes_contato: extract(ss.getSheetByName('Funcoes'))
  };
  cache.put('dicts_acessos_v7', JSON.stringify(result), 21600);
  return result;
}

function saveUserAccess(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  var rows = sheet.getDataRange().getValues();
  var targetId = data.userId ? data.userId.toString().trim().toUpperCase() : "";
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
    var rowId = rows[i][25] ? rows[i][25].toString().trim().toUpperCase() : "";
    if (rowId === targetId) { 
      sheet.getRange(i + 1, 28).setValue(txt(newCodigo)); // Força Texto
      sheet.getRange(i + 1, 6).setValue(equipesNomesStr);
      if (data.senha && data.senha.toString().trim() !== "") sheet.getRange(i + 1, 27).setValue(txt(generateHash(data.senha))); // Força Texto
      return { status: 'success', message: 'Acesso atualizado com sucesso!' };
    }
  }
  return { status: 'error', message: 'Contato não encontrado com o ID: ' + targetId };
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
// EVENTOS (ETAPA 2: MODELO JSON 1 LINHA)
// ==========================================
function createEvent(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };

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
    txt(newId),                      // A: ID
    ev.nome || "",                   // B: Nome
    ev.data || "",                   // C: Data
    ev.tipo || "",                   // D: Tipo
    ev.bairro || "",                 // E: Bairro
    data.hierarquia || "[]",         // F: JSON
    "",                              // G: Lista_Presenca
    ev.descricao || "",              // H: Desc
    "Pendente",                      // I: Status
    ""                               // J: QR_Token
  ]);

  return { status: 'success', message: 'Evento criado com sucesso!', newId: newId };
}

function updateEvent(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };

  var dataRows = sheet.getDataRange().getValues();
  var eventId = data.eventId;
  var ev = data.eventData;
  var hierarquiaJson = data.hierarquia || "[]";
  var updated = false;
  var newRows = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    if (i === 0) { 
      newRows.push(dataRows[i]);
      continue;
    }
    if (dataRows[i][0].toString() == eventId.toString()) {
      updated = true; 
      continue;
    }
    newRows.push(dataRows[i]); 
  }
  
  if (updated) {
    newRows.push([
      txt(eventId), 
      ev.nome || "", 
      ev.data || "", 
      ev.tipo || "", 
      ev.bairro || "",            
      hierarquiaJson, 
      "",                         
      ev.descricao || "", 
      "Pendente",                 
      ""                          
    ]);
    
    sheet.clearContents();
    sheet.getRange(1, 1, newRows.length, newRows[0].length).setValues(newRows);
    return { status: 'success', message: 'Evento atualizado!' };
  }
  return { status: 'error', message: 'Evento não encontrado.' };
}

// ETAPA 2: Presença agora loga na aba 'Presencas'
function updatePresence(data) {
  var presencaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Presencas");
  if (!presencaSheet) return { status: 'error', message: 'Aba Presencas não encontrada.' };

  presencaSheet.appendRow([
    new Date(),                       // A: Timestamp
    txt(data.eventId || ""),          // B: ID_Evento
    txt(data.mobId || ""),            // C: ID_Organizador
    txt(data.presence || ""),         // D: ID_Participante
    data.lat || "",                   // E: Latitude
    data.lng || ""                    // F: Longitude
  ]);

  registrarLogAtuacao({ userId: data.mobId || 'unknown', acao: 'CHECKIN_PRESENCA', refId: data.eventId + '_' + data.presence, lat: data.lat || '', lng: data.lng || '', status: 'OK' });
  
  return { status: 'success', message: 'Presença registrada no log!' };
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

function createContact(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  var lastRow = sheet.getLastRow(), maxIdNum = 0;
  if (lastRow > 1) {
    sheet.getRange(2, 26, lastRow - 1, 1).getValues().forEach(function(row) {
      if (row[0]) { var num = parseInt(row[0].toString().replace(/'/g, ""), 36); if (!isNaN(num) && num > maxIdNum) maxIdNum = num; } // Ignora apóstrofo ao ler
    });
  }
  var newId = (maxIdNum + 1).toString(36).toUpperCase().padStart(4, '0');
  sheet.appendRow([
    data.bairro || "", data.nome || "", formatPhoneBackend(data.telefone), data.ref || "", 
    data.funcao || "MOBILIZADOR(A)", data.equipe || "", new Date(), 
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    txt(newId), // Z: ID forçado como texto
    "", "" 
  ]);
  registrarLogAtuacao({ userId: data.userId || 'unknown', acao: 'CAD_CONTATO', refId: newId, lat: data.lat || '', lng: data.lng || '', status: 'OK' });
  return { status: 'success', newId: newId };
}

function updateContact(data) {
  var ss = SpreadsheetApp.openById(CONTATOS_SHEET_ID);
  var sheet = ss.getSheetByName(CONTATOS_SHEET_NAME);
  if (!sheet) return { status: 'error', message: 'Aba não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var updated = false;
  for (var i = 1; i < dataRows.length; i++) {
    if (dataRows[i][25].toString().replace(/'/g, "") == data.id.toString()) { // Ignora apóstrofo ao comparar
      sheet.getRange(i + 1, 1).setValue(data.bairro); sheet.getRange(i + 1, 2).setValue(data.nome);   
      sheet.getRange(i + 1, 3).setValue(formatPhoneBackend(data.telefone)); sheet.getRange(i + 1, 4).setValue(data.ref);       
      sheet.getRange(i + 1, 5).setValue(data.funcao); sheet.getRange(i + 1, 6).setValue(data.equipe);    
      updated = true; break;
    }
  }
  return updated ? { status: 'success', message: 'Contato atualizado!' } : { status: 'error', message: 'Contato não encontrado.' };
}

function lookupContactByPhone(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base_Contatos');
  if (!sheet) return { status: 'error', message: 'Aba Base_Contatos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var formattedInput = formatPhoneBackend(data.phone);
  for (var i = 1; i < dataRows.length; i++) {
    if (formatPhoneBackend(dataRows[i][2]) === formattedInput) {
      return { 
        status: 'success', 
        contact: {
          id: dataRows[i][25] ? dataRows[i][25].toString().replace(/'/g, "").trim().toUpperCase() : "", // Limpa apóstrofo
          nome: dataRows[i][1] ? dataRows[i][1].toString().trim() : "", 
          bairro: dataRows[i][0] ? dataRows[i][0].toString().trim() : "", 
          ref: dataRows[i][3] ? dataRows[i][3].toString().trim() : "", 
          equipe: dataRows[i][5] ? dataRows[i][5].toString().trim() : "",
          funcao: dataRows[i][4] ? dataRows[i][4].toString().trim() : "",
          codigoAcesso: dataRows[i][27] ? dataRows[i][27].toString().replace(/'/g, "").trim() : "", // Limpa apóstrofo
          hasSenha: dataRows[i][26] ? dataRows[i][26].toString().trim() !== "" : false
        }
      };
    }
  }
  return { status: 'success', contact: null }; 
}

// ==========================================
// QR CODE E KIOSK (AJUSTADO PARA JSON)
// ==========================================
function generateQRToken(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var dataRows = sheet.getDataRange().getValues();
  var token = Math.random().toString(36).substring(2, 10); 
  var updated = false;
  for (var i = 1; i < dataRows.length; i++) { 
    if (dataRows[i][0].toString() == data.eventId.toString()) { 
      sheet.getRange(i + 1, 10).setValue(token); 
      updated = true; 
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
      sheet.getRange(i + 1, 10).setValue(''); 
      updated = true; 
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
      eventName = dataRows[i][1]; 
      eventDate = dataRows[i][2];
      if (dataRows[i][9] === data.token) { 
        tokenValid = true;
      }
    }
  }
  return tokenValid ? { status: 'success', eventName: eventName, eventDate: eventDate } : { status: 'error', message: 'QR Code inválido ou desativado.' };
}

// Helper para extrair IDs do JSON hierárquico
function extractIdsFromJson(node) {
  var ids = [];
  if (node.id) ids.push(node.id.toString().trim().toUpperCase());
  if (node.filhos && Array.isArray(node.filhos)) {
    node.filhos.forEach(function(child) {
      ids = ids.concat(extractIdsFromJson(child));
    });
  }
  return ids;
}

function authorizeKioskMobilizer(data) {
  var eventSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!eventSheet) return { status: 'error', message: 'Aba Eventos não encontrada.' };
  var eventDataRows = eventSheet.getDataRange().getValues();
  var eventId = data.eventId;
  var token = data.token;
  var authorizedMobId = null;
  var tokenValid = false;
  var estruturaJson = "[]";
  
  for (var i = 1; i < eventDataRows.length; i++) {
    if (eventDataRows[i][0].toString() == eventId.toString() && eventDataRows[i][9] === token) { 
      tokenValid = true;
      estruturaJson = eventDataRows[i][5] ? eventDataRows[i][5].toString() : "[]"; 
      break;
    }
  }
  
  if (!tokenValid) return { status: 'error', message: 'Token inválido.' };
  
  var arvore;
  try {
    arvore = JSON.parse(estruturaJson);
  } catch (e) {
    return { status: 'error', message: 'Estrutura hierárquica do evento corrompida.' };
  }
  
  var allHierIds = [];
  arvore.forEach(function(node) {
    allHierIds = allHierIds.concat(extractIdsFromJson(node));
  });
  
  if (allHierIds.length === 0) return { status: 'error', message: 'Evento sem organizadores definidos.' };
  
  var contatosSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base_Contatos');
  if (!contatosSheet) return { status: 'error', message: 'Base de Contatos não encontrada.' };
  var contactRows = contatosSheet.getDataRange().getValues();
  var formattedInput = formatPhoneBackend(data.phone);
  
  for (var j = 1; j < contactRows.length; j++) {
    var rowId = contactRows[j][25] ? contactRows[j][25].toString().replace(/'/g, "").trim().toUpperCase() : ""; // Limpa apóstrofo
    if (formatPhoneBackend(contactRows[j][2]) === formattedInput && rowId) {
      if (allHierIds.indexOf(rowId) !== -1) { 
        authorizedMobId = rowId; 
        break; 
      }
    }
  }
  
  return authorizedMobId ? { status: 'success', mobId: authorizedMobId } : { status: 'error', message: 'Telefone não autorizado para este evento.' };
}