// branched from MIT-licensed code at 
// https://github.com/OliverBalfour/obsidian-pandoc/blob/master/renderer.ts

import * as path from 'path';

import QuipPlugin from './main';

import { FileSystemAdapter, MarkdownRenderer, MarkdownView, Notice } from 'obsidian';

// Takes any file path like '/home/oliver/zettelkasten/Obsidian.md' and
// takes the base name, in this case 'Obsidian'
function fileBaseName(file: string): string {
    return path.basename(file, path.extname(file));
}


async function postProcessRenderedHTML(plugin: QuipPlugin, inputFile: string, wrapper: HTMLElement,
    parentFiles: string[] = [])
{
    const adapter = plugin.app.vault.adapter as FileSystemAdapter;
    // Fix <span src="image.png">
    for (let span of Array.from(wrapper.querySelectorAll('span[src$=".png"], span[src$=".jpg"], span[src$=".gif"], span[src$=".jpeg"]'))) {
        span.innerHTML = '';
        span.outerHTML = span.outerHTML.replace(/span/g, 'img');
    }
    // Fix <span class='internal-embed' src='another_note_without_extension'>
    for (let span of Array.from(wrapper.querySelectorAll('span.internal-embed'))) {
        let src = span.getAttribute('src');
        if (src) {
            const subfolder = inputFile.substring(adapter.getBasePath().length);  // TODO: this is messy
            const file = plugin.app.metadataCache.getFirstLinkpathDest(src, subfolder);
            try {
                if (parentFiles.indexOf(file.path) !== -1) {
                    // We've got an infinite recursion on our hands
                    // We should replace the embed with a wikilink
                    // Then our link processing happens afterwards
                    span.outerHTML = `<a href="${file}">${span.innerHTML}</a>`;
                } else {
                    const markdown = await adapter.read(file.path);
                    const newParentFiles = [...parentFiles];
                    newParentFiles.push(inputFile);
                    // TODO: because of this cast, embedded notes won't be able to handle complex plugins (eg DataView)
                    const html = await render(plugin, { data: markdown } as MarkdownView, file.path, newParentFiles);
                    span.outerHTML = html;
                }
            } catch (e) {
                // Continue if it can't be loaded
                console.error("Pandoc plugin encountered an error trying to load an embedded note: " + e.toString());
            }
        }
    }
    // Remove YAML frontmatter from the output
    Array.from(wrapper.querySelectorAll('.frontmatter, .frontmatter-container'))
        .forEach(el => wrapper.removeChild(el));
}


export default async function render (plugin: QuipPlugin, view: MarkdownView,
    inputFile: string, parentFiles: string[] = []):
    Promise<string>
{
    // Use Obsidian's markdown renderer to render to a hidden <div>
    const markdown = view.data;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'hidden';
    document.body.appendChild(wrapper);
    await MarkdownRenderer.renderMarkdown(markdown, wrapper, path.dirname(inputFile), view);

    // Post-process the HTML in-place
    await postProcessRenderedHTML(plugin, inputFile, wrapper,
        parentFiles);
    let html = wrapper.innerHTML;
    document.body.removeChild(wrapper);

    // If it's a top level note, make the HTML a standalone document - inject CSS, a <title>, etc.
    const title = fileBaseName(inputFile);
    if (parentFiles.length === 0) {
        html = await standaloneHTML(html, title);
    }

    return html;
}

async function standaloneHTML(html: string, title: string): Promise<string> {
    // Wraps an HTML fragment in a proper document structure
    // Don't bother with CSS Quip will ignore

    return `<!doctype html>\n` +
        `<html>\n` +
        `    <head>\n` +
        `        <title>${title}</title>\n` +
        `        <meta charset='utf-8'/>\n` +
        `    </head>\n` +
        `    <body>\n` +
        `${html}\n` +
        `    </body>\n` +
        `</html>`;
}