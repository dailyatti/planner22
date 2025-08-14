import { $, $$, debounce, escapeHtml } from './utils.js';

let onChange = () => {};

export function initTodos(save){
  onChange = save || (()=>{});
  $('#addTodo').addEventListener('click', () => addTodoItem(''));
  // autosave existing static inputs (if any loaded initially)
  $$('#todoList').forEach(()=> onChange());
}

export function addTodoItem(text='', completed=false){
  const list = $('#todoList');
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.innerHTML = `
    <input type="checkbox" class="todo-checkbox" ${completed ? 'checked' : ''} />
    <input type="text" class="todo-input" placeholder="Add a new task…" value="${escapeHtml(text)}" />
    <div class="todo-actions">
      <button class="icon-btn" title="Duplicate" aria-label="Duplicate"><i class="fa-regular fa-clone"></i></button>
      <button class="icon-btn" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  const checkbox = li.querySelector('.todo-checkbox');
  const input = li.querySelector('.todo-input');
  const [btnClone, btnDelete] = li.querySelectorAll('.icon-btn');
  checkbox.addEventListener('change', () => { input.classList.toggle('completed', checkbox.checked); onChange(); });
  input.addEventListener('input', debounce(onChange, 250));
  input.addEventListener('blur', onChange);
  input.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      addTodoItem('');
      onChange();
    }
  });
  btnDelete.addEventListener('click', () => { li.remove(); onChange(); });
  btnClone.addEventListener('click', () => { addTodoItem(input.value, checkbox.checked); });
  list.appendChild(li); input.focus();
}

export function getTodos(){
  return $$('#todoList .todo-item').map(li => ({
    text: li.querySelector('.todo-input').value.trim(),
    completed: li.querySelector('.todo-checkbox').checked
  })).filter(t => t.text !== '');
}

export function setTodos(items){
  const list = $('#todoList'); list.innerHTML = '';
  if(!Array.isArray(items) || !items.length){ addTodoItem(''); return; }
  items.forEach(t => addTodoItem(t?.text ?? '', !!t?.completed));
}


