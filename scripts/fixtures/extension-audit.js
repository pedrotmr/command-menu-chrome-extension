const root = document.querySelector('#component').attachShadow({ mode: 'open' });
const label = document.createElement('label');
label.textContent = 'Shadow page field ';
const input = document.createElement('input');
input.setAttribute('aria-label', 'Shadow page field');
input.value = 'Nested focus target';
label.append(input);
root.append(label);
document.querySelector('#page-button').addEventListener('click', () => {
  document.querySelector('#status').textContent = 'Page button activated';
});
