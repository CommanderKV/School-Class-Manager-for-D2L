// Remove the loading animation
document.querySelector('#grades').remove();


// Display a work in progress message
const workInProgress = document.createElement('div');
workInProgress.style = 'display: flex; flex-direction: row; align-content: center; justify-content: center;';
workInProgress.innerHTML = '<h1>Work in progress</h1>';
document.querySelector('main').appendChild(workInProgress);