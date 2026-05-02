// Calculator logic (infix expression support with functions and nRT)
document.addEventListener('DOMContentLoaded', () => {
  const historyEl = document.getElementById('history');
  const bufferEl = document.getElementById('buffer');
  const currentEl = document.getElementById('current');
  const keysEl = document.getElementById('keys');

  let exprTokens = []; // tokens in infix order (numbers as strings, operator tokens, parentheses)
  let currentValue = '';
  let lastResult = null;
  let justEvaluated = false;
  const history = [];

  const numberRegex = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

  const operators = {
    '+': { prec: 2, assoc: 'L', fn: (a, b) => a + b },
    '-': { prec: 2, assoc: 'L', fn: (a, b) => a - b },
    '*': { prec: 3, assoc: 'L', fn: (a, b) => a * b },
    '/': { prec: 3, assoc: 'L', fn: (a, b) => (b === 0 ? 'Error' : a / b) },
    '%': { prec: 3, assoc: 'L', fn: (a, b) => (b === 0 ? 'Error' : (a - Math.floor(a / b) * b)) },
    '//': { prec: 3, assoc: 'L', fn: (a, b) => (b === 0 ? 'Error' : Math.floor(a / b)) },
    '^': { prec: 4, assoc: 'R', fn: (a, b) => Math.pow(a, b) },
    'log': { prec: 4, assoc: 'R', fn: (a, b) => {
      if (typeof a !== 'number' || typeof b !== 'number') return 'Error';
      if (a <= 0 || a === 1 || b <= 0) return 'Error';
      return Math.log(b) / Math.log(a);
    } },
    'nrt': { prec: 4, assoc: 'R', fn: (a, b) => (a === 0 ? 'Error' : Math.pow(b, 1 / a)) },
  };

  function formatNumberForDisplay(n) {
    if (n === 'Error') return 'Error';
    if (!Number.isFinite(n)) return 'Error';
    return Number(n.toPrecision(12)).toString();
  }

  function pushHistory(line) {
    history.push(line);
    if (history.length > 5) history.shift();
  }

  function isNumberToken(t) {
    return typeof t === 'string' && numberRegex.test(t);
  }

  function pushCurrentNumber() {
    if (currentValue !== '') {
      exprTokens.push(currentValue);
      currentValue = '';
    }
  }

  function updateDisplay() {
    // update history
    historyEl.innerHTML = '';
    for (let i = history.length - 1; i >= 0; i--) {
      const div = document.createElement('div');
      div.className = 'line';
      div.textContent = history[i];
      historyEl.appendChild(div);
    }

    // buffer: show the current infix expression + currentValue
    const bufferParts = exprTokens.slice();
    if (currentValue !== '') bufferParts.push(currentValue);
    bufferEl.textContent = bufferParts.join(' ');

    // main current display: show currentValue or last token or 0
    if (currentValue !== '') {
      currentEl.textContent = currentValue;
    } else if (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1])) {
      currentEl.textContent = formatNumberForDisplay(parseFloat(exprTokens[exprTokens.length - 1]));
    } else if (lastResult !== null) {
      currentEl.textContent = formatNumberForDisplay(lastResult);
    } else {
      currentEl.textContent = '0';
    }
  }

  function addOperatorToken(op) {
    // If we just evaluated an expression, make sure the answer stays in the buffer
    if (justEvaluated) {
      // If there's a visible currentValue (formatted result) use it as the lhs
      if (currentValue !== '') {
        // leave currentValue so pushCurrentNumber will move it into exprTokens
      } else if (exprTokens.length === 0 && lastResult !== null) {
        // no currentValue (edge case) — seed exprTokens with lastResult
        exprTokens = [String(formatNumberForDisplay(lastResult))];
      }
      justEvaluated = false;
    }
    pushCurrentNumber();

    // If nothing was pushed and we have a lastResult, use it as lhs
    if (exprTokens.length === 0 && currentValue === '' && lastResult !== null) {
      exprTokens.push(String(formatNumberForDisplay(lastResult)));
    }
    const last = exprTokens[exprTokens.length - 1];
    if (last && (isOperator(last) || last === '(') && op !== '(') {
      // replace previous operator if consecutive (except allow '(')
      if (isOperator(last)) exprTokens[exprTokens.length - 1] = op;
      else exprTokens.push(op);
    } else {
      exprTokens.push(op);
    }
    updateDisplay();
  }

  function isOperator(tok) {
    return Object.prototype.hasOwnProperty.call(operators, tok);
  }

  function applyLog() {
    // If there's a number before (like "2 log 10") the button acts as a binary operator.
    // Otherwise behave as the original unary base-10 log (log10).
    if (currentValue === '' && exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1])) {
      // Insert 'log' operator into expression stream
      addOperatorToken('log');
      updateDisplay();
      return;
    }
    if (currentValue !== '') {
      const v = parseFloat(currentValue);
      const res = (isNaN(v) || v <= 0) ? 'Error' : Math.log10(v);
      if (res === 'Error') { pushHistory('Error'); currentValue = ''; exprTokens = []; lastResult = null; }
      else currentValue = String(formatNumberForDisplay(res));
    } else if (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1])) {
      const v = parseFloat(exprTokens.pop());
      const res = (isNaN(v) || v <= 0) ? 'Error' : Math.log10(v);
      if (res === 'Error') { pushHistory('Error'); currentValue = ''; exprTokens = []; lastResult = null; }
      else currentValue = String(formatNumberForDisplay(res));
    } else if (lastResult !== null) {
      const res = (lastResult <= 0) ? 'Error' : Math.log10(lastResult);
      if (res === 'Error') { pushHistory('Error'); currentValue = ''; exprTokens = []; lastResult = null; }
      else currentValue = String(formatNumberForDisplay(res));
    }
    justEvaluated = false;
    updateDisplay();
  }

  function applyExp() {
    if (currentValue !== '') {
      const v = parseFloat(currentValue);
      const res = Math.exp(v);
      currentValue = String(formatNumberForDisplay(res));
    } else if (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1])) {
      const v = parseFloat(exprTokens.pop());
      const res = Math.exp(v);
      currentValue = String(formatNumberForDisplay(res));
    } else if (lastResult !== null) {
      const res = Math.exp(lastResult);
      currentValue = String(formatNumberForDisplay(res));
    }
    justEvaluated = false;
    updateDisplay();
  }

  function addParenthesis(side) {
    if (side === '(') {
      // if currentValue present, implicitly multiply: push number then '*'
      if (currentValue !== '') {
        exprTokens.push(currentValue);
        exprTokens.push('*');
        currentValue = '';
      }
      exprTokens.push('(');
    } else {
      // closing parenthesis
      pushCurrentNumber();
      exprTokens.push(')');
    }
    updateDisplay();
  }

  function toggleSign() {
    if (currentValue !== '') {
      if (currentValue.startsWith('-')) currentValue = currentValue.slice(1);
      else currentValue = '-' + currentValue;
    } else if (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1])) {
      const last = exprTokens.pop();
      if (last.startsWith('-')) exprTokens.push(last.slice(1));
      else exprTokens.push('-' + last);
    } else {
      currentValue = '-';
    }
    updateDisplay();
  }

  function evaluateExpression(tokens) {
    // Shunting-yard to RPN
    const output = [];
    const ops = [];
    for (let t of tokens) {
      if (isNumberToken(t)) {
        output.push(Number(t));
      } else if (t === '(') {
        ops.push(t);
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
        if (!ops.length) return 'Error';
        ops.pop(); // pop '('
      } else if (isOperator(t)) {
        while (ops.length && isOperator(ops[ops.length - 1])) {
          const o1 = t;
          const o2 = ops[ops.length - 1];
          if ((operators[o1].assoc === 'L' && operators[o1].prec <= operators[o2].prec) ||
              (operators[o1].assoc === 'R' && operators[o1].prec < operators[o2].prec)) {
            output.push(ops.pop());
            continue;
          }
          break;
        }
        ops.push(t);
      } else {
        return 'Error';
      }
    }
    while (ops.length) {
      const o = ops.pop();
      if (o === '(' || o === ')') return 'Error';
      output.push(o);
    }

    // Evaluate RPN
    const st = [];
    for (let tok of output) {
      if (typeof tok === 'number') st.push(tok);
      else if (isOperator(tok)) {
        const b = st.pop();
        const a = st.pop();
        if (a === undefined || b === undefined) return 'Error';
        const res = operators[tok].fn(a, b);
        if (res === 'Error' || !Number.isFinite(res)) return 'Error';
        st.push(res);
      } else return 'Error';
    }
    if (st.length !== 1) return 'Error';
    return st[0];
  }

  function pressEquals() {
    pushCurrentNumber();
    if (exprTokens.length === 0) return;
    const exprCopy = exprTokens.slice();
    const res = evaluateExpression(exprCopy);
    if (res === 'Error' || !Number.isFinite(res)) {
      pushHistory('Error');
      currentValue = '';
      exprTokens = [];
      lastResult = null;
      updateDisplay();
      return;
    }
    pushHistory(`${exprCopy.join(' ')} = ${formatNumberForDisplay(res)}`);
    currentValue = String(formatNumberForDisplay(res));
    lastResult = res;
    exprTokens = [];
    justEvaluated = true;
    updateDisplay();
  }

  function pressBackspace() {
    if (justEvaluated) {
      currentValue = '';
      justEvaluated = false;
      updateDisplay();
      return;
    }
    if (currentValue.length > 0) {
      currentValue = currentValue.slice(0, -1);
      updateDisplay();
      return;
    }
    if (exprTokens.length === 0) return;
    const last = exprTokens.pop();
    if (isNumberToken(last)) {
      // move into currentValue for editing
      currentValue = String(last);
      currentValue = currentValue.slice(0, -1);
    }
    updateDisplay();
  }

  function pressClear() {
    exprTokens = [];
    currentValue = '';
    lastResult = null;
    justEvaluated = false;
    updateDisplay();
  }

  function pressDigit(d) {
    if (justEvaluated) {
      exprTokens = [];
      currentValue = '';
      justEvaluated = false;
    }
    if (d === '.') {
      if (currentValue.includes('.')) return;
      if (currentValue === '' || currentValue === '-') currentValue += '0.';
      else currentValue += '.';
    } else {
      if (currentValue === '0') currentValue = d;
      else currentValue += d;
    }
    updateDisplay();
  }

  const actionToToken = {
    add: '+', subtract: '-', multiply: '*', divide: '/', mod: '%', intdiv: '//', power: '^', nrt: 'nrt', log: 'log'
  };

  keysEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('digit')) {
      pressDigit(btn.dataset.digit);
      return;
    }
    const action = btn.dataset.action;
    if (!action) return;
    if (action === 'clear') pressClear();
    else if (action === 'back') pressBackspace();
    else if (action === 'equals') pressEquals();
    else if (action === 'log') {
      // If there's a current number (user just typed it) or the last token is a number,
      // treat 'log' as the binary operator (base log). Otherwise act as unary log10.
      if (currentValue !== '' || (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1]))) {
        addOperatorToken('log');
      } else {
        applyLog();
      }
    }
    else if (action === 'exp') applyExp();
    else if (action === 'sign') toggleSign();
    else if (action === 'paren-l') addParenthesis('(');
    else if (action === 'paren-r') addParenthesis(')');
    else if (actionToToken[action]) addOperatorToken(actionToToken[action]);
  });

  window.addEventListener('keydown', (ev) => {
    if (/^[0-9]$/.test(ev.key)) { pressDigit(ev.key); ev.preventDefault(); return; }
    if (ev.key === '.') { pressDigit('.'); ev.preventDefault(); return; }
    if (ev.key === 'Enter' || ev.key === '=') { pressEquals(); ev.preventDefault(); return; }
    if (ev.key === '+') { addOperatorToken('+'); ev.preventDefault(); return; }
    if (ev.key === '-') { addOperatorToken('-'); ev.preventDefault(); return; }
    if (ev.key === '*') { addOperatorToken('*'); ev.preventDefault(); return; }
    if (ev.key === '/') { addOperatorToken('/'); ev.preventDefault(); return; }
    if (ev.key === '%') { addOperatorToken('%'); ev.preventDefault(); return; }
    if (ev.key === '^') { addOperatorToken('^'); ev.preventDefault(); return; }
    // allow 'x' to mean power (x^y), keep '*' for multiplication
    if (ev.key.toLowerCase() === 'x') { addOperatorToken('^'); ev.preventDefault(); return; }
    if (ev.key.toLowerCase() === 'i') { addOperatorToken('//'); ev.preventDefault(); return; }
    // allow both 'n' and 'r' to trigger nRT
    if (ev.key.toLowerCase() === 'n' || ev.key.toLowerCase() === 'r') { addOperatorToken('nrt'); ev.preventDefault(); return; }
    if (ev.key.toLowerCase() === 'l') {
      // Same logic as clicking the log button: if user has just typed a number or
      // there's a numeric token before, insert binary 'log'; otherwise do unary log10.
      if (currentValue !== '' || (exprTokens.length > 0 && isNumberToken(exprTokens[exprTokens.length - 1]))) {
        addOperatorToken('log');
      } else {
        applyLog();
      }
      ev.preventDefault();
      return;
    }
    if (ev.key.toLowerCase() === 'e') { applyExp(); ev.preventDefault(); return; }
    if (ev.key === '(') { addParenthesis('('); ev.preventDefault(); return; }
    if (ev.key === ')') { addParenthesis(')'); ev.preventDefault(); return; }
    if (ev.key === 'Backspace') { pressBackspace(); ev.preventDefault(); return; }
    if (ev.key.toLowerCase() === 'c') { pressClear(); ev.preventDefault(); return; }
    if (ev.key.toLowerCase() === 's') { toggleSign(); ev.preventDefault(); return; }
  });

  updateDisplay();
});
