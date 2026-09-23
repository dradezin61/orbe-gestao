# Fontes das fotografias do catálogo

Todas as fotografias vêm da **coleção gratuita do Unsplash** ([licença](https://unsplash.com/license)),
que permite uso comercial e dispensa atribuição — creditamos mesmo assim.
Nenhuma imagem é do Unsplash+ (a coleção paga), nenhuma foi gerada por IA e
nenhuma se repete entre produtos.

Os arquivos foram baixados em 22/09/2026, recortados em quadrado a 1200 px e
salvos em `public/products/`. Cada um foi aberto e conferido: a foto mostra o
produto que o nome descreve.

| Slug | Arquivo | Foto (Unsplash) | Autor |
| --- | --- | --- | --- |
| `cadeira-linea` | `cadeira-linea.jpg` | [brown wooden chair beside white wall](https://unsplash.com/photos/brown-wooden-chair-beside-white-wall-HtF2wx-_R8s) | Ronnarit Jirathanyakorn |
| `caderno-pautado` | `caderno-pautado.jpg` | [empty spiral notebook near keyboard and pen](https://unsplash.com/photos/empty-spiral-notebook-near-keyboard-and-pen-vdaJJbls3xE) | Marissa Grootes |
| `capa-notebook-feltro` | `capa-notebook-feltro.jpg` | [gray and brown laptop case](https://unsplash.com/photos/gray-and-brown-laptop-case-CI-5GwJcVjE) | Lee Campbell |
| `jarra-vidro` | `jarra-vidro.jpg` | [an elegant, diamond-patterned glass pitcher](https://unsplash.com/photos/an-elegant-diamond-patterned-glass-pitcher-e8Eyb_tM4Lc) | Marco Palumbo |
| `kit-canetas` | `kit-canetas.jpg` | [a group of pens sitting in front of a black bag](https://unsplash.com/photos/a-group-of-pens-sitting-in-front-of-a-black-bag) | Anna Evans |
| `luminaria-arco` | `luminaria-arco.jpg` | [a modern lamp with a wooden base glows softly](https://unsplash.com/photos/a-modern-lamp-with-a-wooden-base-glows-softly-VdrwI_63-Po) | Bhautik Patel |
| `luminaria-pendente-esfera` | `luminaria-pendente-esfera.jpg` | [clear glass ball with black and white stick inside](https://unsplash.com/photos/clear-glass-ball-with-black-and-white-stick-inside-i4DOBIhYDEY) | Callum Hill |
| `mesa-lateral-orbe` | `mesa-lateral-orbe.jpg` | [round brown table beside two white chairs](https://unsplash.com/photos/round-brown-table-beside-two-white-chairs-GkyrU8Olw2c) | Nathan Dumlao |
| `organizador-mesa` | `organizador-mesa.jpg` | [a metal cup filled with assorted pens and pencils](https://unsplash.com/photos/a-metal-cup-filled-with-assorted-pens-and-pencils-XzAcS0l576E) | Babak Eshaghian |
| `porta-cabos-couro` | `porta-cabos-couro.jpg` | [a wood box with a wire](https://unsplash.com/photos/a-wood-box-with-a-wire-qPWYjFBMcDo) | Workperch |
| `prateleira-modular` | `prateleira-modular.jpg` | [empty light wooden shelf on a cream wall](https://unsplash.com/photos/empty-light-wooden-shelf-on-a-cream-wall-Er2gvVJ8EiQ) | Josh Davies |
| `suporte-notebook` | `suporte-notebook.jpg` | [a laptop computer sitting on top of a wooden desk](https://unsplash.com/photos/a-laptop-computer-sitting-on-top-of-a-wooden-desk-hzb5xjTbkfQ) | Workperch |

## Nomes ajustados para bater com a foto

Três produtos foram renomeados porque a fotografia disponível mostrava outra
coisa. O slug, que é identificador técnico, ficou como estava:

| Slug | Antes | Agora | Por quê |
| --- | --- | --- | --- |
| `luminaria-arco` | Luminária Arco | Luminária de Mesa | A foto é de uma luminária de base cilíndrica, não de haste em arco. |
| `porta-cabos-couro` | Porta-cabos de Couro | Bandeja de Couro | Não há, na coleção gratuita, foto de tiras de couro para cabos; a escolhida é uma bandeja de couro com cabo, cartões e caneta. |
| `kit-canetas` | (mesmo nome) | Kit de Canetas | A descrição deixou de citar três espessuras e tinta preta: a foto mostra canetas coloridas em estojo. |

As descrições também perderam especificações que a fotografia não sustenta —
potência, litragem, capacidade de carga, dimensões e compatibilidade. O que
sobrou é o que dá para ver.

## Como trocar uma fotografia

1. Salve o arquivo em `public/products/` (quadrado, até ~250 KB).
2. No painel da loja, edite o produto e preencha **Caminho da fotografia**
   (`/products/arquivo.jpg`) e **Descrição da fotografia**.
3. Registre aqui a origem, o autor e a licença.
