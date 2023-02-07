// branched from MIT-licensed code at 
// https://github.com/OliverBalfour/obsidian-pandoc/blob/master/renderer.ts

import QuipPlugin from './main';

import { MarkdownRenderer, MarkdownView, TFile, Vault } from 'obsidian';

interface LookupTable {
    [index: string]: string
}

const mimeTypeTable : LookupTable = {
    bmp: 'image/x-ms-bmp',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp'
}


async function postProcessRenderedHTML(plugin: QuipPlugin, inputFile: TFile, wrapper: HTMLElement,
    parentFiles: string[] = [])
{
    const vault = plugin.app.vault as Vault;
    // Fix <span src="image.png">
    for (const span of Array.from(wrapper.querySelectorAll('span[src$=".png"], span[src$=".jpg"], span[src$=".gif"], span[src$=".jpeg"]'))) {
        const img = createEl('img', {
            'attr': {'src': span.getAttr("src") },
            'cls': span.className
        });
        span.replaceWith(img);
    }
    if (plugin.settings.inlineEmbeds) {
        // Fix <img class='internal-embed' src='file_in_vault'>
        for (const span of Array.from(wrapper.querySelectorAll('img.internal-embed'))) {
            const src = span.getAttribute('src');
            if (src) {
                const subfolder = inputFile.parent;
                const file = plugin.app.metadataCache.getFirstLinkpathDest(src, subfolder.path);
                try {
                    const bytes = await vault.readBinary(file);
                    const type = mimeTypeTable[file.extension] ?? 'image/jpeg';
                    const encoded = Buffer.from(bytes).toString('base64');
                    span.setAttribute('src', `data:${type};base64,${encoded}`);

                } catch (e) {
                    // Continue if it can't be loaded
                    console.error("Quip plugin encountered an error trying to load an embedded image: " + e.toString());
                }
            }
        }
        // Fix <span class='internal-embed' src='another_note_without_extension'>
        for (const span of Array.from(wrapper.querySelectorAll('span.internal-embed'))) {
            const src = span.getAttribute('src');
            if (src) {
                const subfolder = inputFile.parent;
                const file = plugin.app.metadataCache.getFirstLinkpathDest(src, subfolder.path);
                try {
                    if (parentFiles.indexOf(file.path) !== -1) {
                        // We've got an infinite recursion on our hands
                        // We should replace the embed with a wikilink
                        // Then our link processing happens afterwards
                        span.outerHTML = `<a href="${file}">${span.innerHTML}</a>`;
                    } else {
                        const markdown = await vault.read(file);
                        const newParentFiles = [...parentFiles];
                        newParentFiles.push(inputFile.path);
                        // TODO: because of this cast, embedded notes won't be able to handle complex plugins (eg DataView)
                        const html = await render(plugin, { data: markdown } as MarkdownView, file, newParentFiles);
                        span.outerHTML = html;
                    }
                } catch (e) {
                    // Continue if it can't be loaded
                    console.error("Quip plugin encountered an error trying to load an embedded note: " + e.toString());
                }
            }
        }
    }
    // Remove YAML frontmatter from the output
    if (plugin.settings.removeYAML) {
        Array.from(wrapper.querySelectorAll('.frontmatter, .frontmatter-container'))
            .forEach(el => wrapper.removeChild(el));
    }
}


export default async function render (plugin: QuipPlugin, view: MarkdownView,
    inputFile: TFile, parentFiles: string[] = []):
    Promise<string>
{
    // Use Obsidian's markdown renderer to render to a hidden <div>
    const markdown = view.data;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'hidden';
    document.body.appendChild(wrapper);
    const sourcePath = inputFile.parent.path;
    await MarkdownRenderer.renderMarkdown(markdown, wrapper, sourcePath, view);

    // Post-process the HTML in-place
    await postProcessRenderedHTML(plugin, inputFile, wrapper,
        parentFiles);
    let html = wrapper.innerHTML;
    document.body.removeChild(wrapper);

    // If it's a top level note, make the HTML a standalone document - inject CSS, a <title>, etc.
    if (parentFiles.length === 0) {
        //html = await standaloneHTML(html);
    }

    return html;
}

async function standaloneHTML(html: string): Promise<string> {
    // Wraps an HTML fragment in a proper document structure
    // Don't bother with CSS Quip will ignore

    return `<!doctype html>\n` +
        `<html>\n` +
        `    <head>\n` +
        `        <meta charset='utf-8'/>\n` +
        `    </head>\n` +
        `    <body>\n` +
        `${html}\n` +
        `    </body>\n` +
        `</html>`;
}