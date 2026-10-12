<p align="center">
  <img src="public/logo.svg" alt="Easy UFSCar" width="260">
</p>

<p align="center">O SIGA e o AVA da UFSCar numa interface só.</p>

---

Site **não oficial**, feito por um aluno, sem vínculo com a UFSCar. Você entra com o RA e a
senha de sempre e vê, num lugar só, o que hoje está espalhado entre o SIGA e o AVA.

## O que ele mostra

- **Início:** o que tem pra entregar, as aulas do dia e os avisos dos professores.
- **Disciplinas:** nota parcial, horário, sala, professor, prazos, plano de ensino e os
  materiais do AVA. Tem uma aba pra estudar, com os tópicos da disciplina pra ir marcando.
- **Curso:** quanto falta pra formar, IRA, médias, boletim de cada semestre e as
  obrigatórias que ainda faltam.

## E a minha senha?

- Ela é usada uma vez, pra entrar no SIGA e no AVA, e descartada. Não vai pra log, arquivo
  nem banco de dados.
- O site não tem banco de dados. Seu histórico fica guardado no seu navegador.
- O servidor só mantém um cookie cifrado com o acesso ao AVA, pra você não digitar a senha
  toda hora. Sair apaga tudo.

O código está aqui justamente pra qualquer um conferir. O login fica em
[`src/app/login/actions.ts`](src/app/login/actions.ts).

## Como funciona

Só o servidor conversa com a UFSCar:

- **SIGA:** não tem API, então o site entra como você e lê as páginas (`src/lib/siga`).
- **AVA:** é um Moodle, e o site usa a mesma API do aplicativo oficial do Moodle (`src/lib/ava`).
- `src/lib/merge` junta os dois pelo código da disciplina, e as telas ficam em `src/app`.

Feito com Next.js, TypeScript, Tailwind e shadcn/ui.

## Achou um problema?

Cada curso e cada professor usa os sistemas de um jeito, então é bem possível que algo
apareça errado pra você. Abra uma issue contando o problema que viu e fique a vontade 
caso queira contribuir com o projeto.
