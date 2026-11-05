const values = new URLSearchParams(location.search);
const title = values.get('title') || 'Sample tab';

document.title = title;
document.querySelector('#title').textContent = title;
document.querySelector('#topic').textContent = `Topic: ${values.get('topic') || 'Sample'}`;
