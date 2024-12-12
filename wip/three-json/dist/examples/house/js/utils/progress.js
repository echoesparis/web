export function createProgressIndicator(xhr) {
    const progress = document.createElement('DIV');
    progress.id = 'progress';
    
    const text = xhr.lengthComputable
        ? `loading: ${Math.round((xhr.loaded / xhr.total * 100))}%`
        : `loading: ${Math.round(xhr.loaded / 1000)}kb`;
        
    progress.textContent = text;
    console.log(text);
    
    return progress;
}

export function updateProgress(container, xhr) {
    const existing = document.getElementById('progress');
    if (existing) {
        existing.remove();
    }
    
    const indicator = createProgressIndicator(xhr);
    container.appendChild(indicator);
}