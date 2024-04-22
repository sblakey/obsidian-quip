// branched from MIT-licensed code at 
// https://github.com/OliverBalfour/obsidian-pandoc/blob/master/renderer.ts

import QuipPlugin from './main';

import { getLinkpath, MarkdownRenderer, MarkdownView, parseFrontMatterEntry, TFile, Vault } from 'obsidian';

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
    await fixInternalLinks(wrapper, plugin, inputFile);
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
        await fixInternalEmbeds(wrapper, inputFile, plugin, vault, parentFiles);
    }

	const fixableBlockquotes = Array.from(wrapper.querySelectorAll('blockquote > p:only-child'))
	fixableBlockquotes.forEach(e => e.replaceWith(...Array.from(e.childNodes)))

	const consecutiveP = Array.from(wrapper.querySelectorAll('p + p'))
	consecutiveP.forEach(e => {
		const spacer = createEl('br')
		e.before(spacer)
	})
    // Remove YAML frontmatter from the output
    if (plugin.settings.removeYAML) {
        Array.from(wrapper.querySelectorAll('.frontmatter, .frontmatter-container'))
            .forEach(el => wrapper.removeChild(el));
    }
}

async function fixInternalEmbeds(wrapper: HTMLElement, inputFile: TFile, plugin: QuipPlugin, vault: Vault, parentFiles: string[]) {
    for (const span of Array.from(wrapper.querySelectorAll('img.internal-embed'))) {
        const src = span.getAttribute('src');
        if (src) {
            await fixInternalEmbedImgWithSrc(inputFile, plugin, src, vault, span);
        }
    }
    // Fix <span class='internal-embed' src='another_note_without_extension'>
    for (const span of Array.from(wrapper.querySelectorAll('span.internal-embed'))) {
        const src = span.getAttribute('src');
        if (src) {
            await fixInternalEmbedSpanWithSrc(inputFile, plugin, src, parentFiles, span, vault);
        }
    }
}

async function fixInternalEmbedSpanWithSrc(inputFile: TFile, plugin: QuipPlugin, src: string, parentFiles: string[], span: Element, vault: Vault) {
    const subfolder = inputFile.parent;
    const file = plugin.app.metadataCache.getFirstLinkpathDest(src, subfolder.path);
    try {
        if (parentFiles.indexOf(file.path) !== -1) {
            // We've got an infinite recursion on our hands
            // We should replace the embed with a wikilink
            // Then our link processing happens afterwards
            span.outerHTML = `<a href="${file}">${span.innerHTML}</a>`;
        } else {
            const html = await renderFile(vault, file, parentFiles, inputFile, plugin);
            span.outerHTML = html;
        }
    } catch (e) {
        // Continue if it can't be loaded
        console.error("Quip plugin encountered an error trying to load an embedded note: " + e.toString());
    }
}


async function fixInternalEmbedImgWithSrc(inputFile: TFile, plugin: QuipPlugin, src: string, vault: Vault, span: Element) {
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

/*
 * Replace any internal links to Obsidian.md notes with links to equivalent
 * Quip notes, if findable from header metadata.
 */
async function fixInternalLinks(wrapper: HTMLElement, plugin: QuipPlugin, inputFile: TFile) {
    for (const anchor of Array.from(wrapper.querySelectorAll('a.internal-link'))) {
        const link = anchor.getAttribute('data-href');
        const file = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(link), inputFile.path);
        if (file && file instanceof TFile) {
            await fixAnchorUsingFile(plugin, anchor, file);
        }
    }
}

async function fixAnchorUsingFile(plugin: QuipPlugin, anchor: Element, file: TFile) {
    await plugin.app.fileManager.processFrontMatter(file, (front_matter) => {
        const quip: string = parseFrontMatterEntry(front_matter, 'quip');
        if (quip) {
            anchor.setAttribute('href', quip);
        }
    });
}

async function renderFile(vault: Vault, file: TFile, parentFiles: string[], inputFile: TFile, plugin: QuipPlugin) {
    const markdown = await vault.read(file);
    const newParentFiles = [...parentFiles];
    newParentFiles.push(inputFile.path);
    const view = new MarkdownView(plugin.app.workspace.getLeaf(false)) as MarkdownView;
    view.data = markdown;
    const html = await render(plugin, view, file, newParentFiles);
    return html;
}

export default async function render(plugin: QuipPlugin, view: MarkdownView,
    inputFile: TFile, parentFiles: string[] = []):
    Promise<string>
{
    // Use Obsidian's markdown renderer to render to a hidden <div>
    const markdown = view.data;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'hidden';
    document.body.appendChild(wrapper);
    const sourcePath = inputFile.parent.path;
    await MarkdownRenderer.render(plugin.app, markdown, wrapper, sourcePath, view);

    // Post-process the HTML in-place
    await postProcessRenderedHTML(plugin, inputFile, wrapper,
        parentFiles);
    const html = wrapper.innerHTML;
    document.body.removeChild(wrapper);

    return html;
}