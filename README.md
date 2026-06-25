# Delay Off

Extensão para reduzir o atraso em transmissões ao vivo do YouTube.

O Delay Off mantém o player mais próximo do **AO VIVO** ajustando automaticamente a velocidade de reprodução quando a live começa a acumular atraso.

Em testes reais, transmissões com cerca de **45 segundos de delay** chegaram perto de **6 segundos**, dependendo da live, da rede e do buffer disponível.

A ideia é simples: o YouTube normalmente prioriza estabilidade. Para isso, o player segura bastante buffer. Em live de futebol, notícia ou evento com chat, esse buffer vira atraso — e atraso vira spoiler.

<img width="307" height="591" alt="image" src="https://github.com/user-attachments/assets/20e9fe2e-2f96-4ca8-8799-56d9b49343ca" />


## O problema

Muitas transmissões ao vivo não rodam em modo de baixa latência.

Na prática, o player pode ficar 15, 20, 30 ou até 45 segundos atrás do ponto real da transmissão.

Às vezes o usuário nem percebe. A live continua tocando, o botão mostra “em direto” cinza, mas o vídeo já ficou para trás e você precisa ficar dando F5 (UX do YouTube é horrível neste ponto)

Isso é especialmente ruim em:

* futebol;
* notícias ao vivo;
* eventos esportivos;
* transmissões com chat;
* lives onde cada segundo importa.

O Delay Off foi feito para evitar isso.



## O que a extensão faz

A extensão monitora o player do YouTube e detecta quando existe atraso acumulado.

Quando necessário, ela aumenta temporariamente a velocidade do vídeo para consumir o excesso de buffer.

Quando o player volta para perto do ponto ao vivo, a velocidade retorna para **1x**.

Também há proteção para evitar acelerar quando o buffer está baixo demais.



## Resultado
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/6ef629c4-416c-4902-9019-a01343c60156" />

Os números variam bastante, mas em alguns cenários o Delay Off consegue aproximar uma live comum do YouTube da faixa de atraso de uma TV aberta digital.



## Exemplo

### Sem corte de buffer

<img width="490" height="183" alt="Transmissão normal com atraso" src="https://github.com/user-attachments/assets/a56a552b-19dc-4b1a-9222-809e6fd0e55e" />

### Com corte de buffer habilitado

<img width="493" height="205" alt="Delay Off reduzindo buffer" src="https://github.com/user-attachments/assets/f8a8a3bd-08a2-4d9f-845c-daf2783ab2bb" />



## Recursos

* sincronização automática com o AO VIVO;
* redução de atraso acumulado;
* ajuste automático da velocidade de reprodução;
* proteção contra buffer muito baixo;
* indicador visual direto no vídeo;
* estatísticas em tempo real;
* configuração de velocidade máxima;
* interface simples.



## Como funciona

O Delay Off acompanha o estado do player e observa principalmente:

* latência atual;
* buffer disponível;
* velocidade de reprodução;
* estado da live;
* distância até o ponto ao vivo.

Quando a live fica atrasada, a extensão acelera o vídeo por alguns segundos.

Quando a transmissão volta para perto do ponto ao vivo, ela retorna para velocidade normal.

A extensão não muda a transmissão. Ela só controla o player local.



## Segurança

O Delay Off não:

* bloqueia anúncios;
* pula anúncios;
* clica em anúncios;
* altera o vídeo original;
* modifica a transmissão;
* intercepta tráfego;
* injeta tráfego;
* descriptografa mídia;
* burla servidores do YouTube.

Tudo acontece localmente no navegador.


## Privacidade

O Delay Off não coleta:

* histórico de navegação;
* vídeos assistidos;
* dados da conta Google;
* cookies;
* informações pessoais.

A lógica roda no próprio navegador.



## Compatibilidade

Navegadores baseados em Chromium:

* Google Chrome
* Microsoft Edge
* Brave
* Opera
* Vivaldi

Firefox pode ser suportado futuramente.


## Limitações

O Delay Off não transforma a transmissão original em low latency.

Ele apenas reduz o atraso que o player acumulou localmente.

O resultado depende de:

* conexão;
* CDN;
* bitrate da live;
* configuração de latência do YouTube;
* desempenho do computador;
* estabilidade do player.

Não existe garantia de chegar sempre em 4, 5 ou 6 segundos se a transmissão ou sua rede estiver com delay. Recomenda-se um ping baixo e internet de pelo menos 5 megabits/seg para rodar bem em 720p


## FAQ

### Isso altera a transmissão?

Não. A extensão atua apenas no player local.

### Isso bloqueia anúncio?

Não. O Delay Off não bloqueia, não pula e não clica em anúncios.

### Isso reduz a qualidade?

Não diretamente. A extensão não força resolução. O YouTube continua controlando a qualidade conforme rede e player.

### Funciona em qualquer live?

Funciona em lives do YouTube compatíveis com o player HTML5.

### Por que isso ajuda em futebol?

Porque reduz a chance de tomar spoiler de gol pelo chat, vizinho, notificação ou rede social.

### Como instalar? (modo desenvolvedor)

1. Baixe o zip e descompacte ele em uma pasta 
2. Abra `chrome://extensions` (ou `edge://extensions`).
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione esta pasta 
5. Abra uma transmissão **ao vivo** no YouTube.



## Licença

MIT


## Aviso

Delay Off é um projeto independente.

Não possui afiliação com Google ou YouTube.

YouTube é marca registrada da Google LLC.
