@echo off
title Vertice Marmores - app local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

if exist node_modules goto rodar
echo.
echo  Instalando as dependencias - so na primeira vez, leva alguns minutos...
echo.
call npm install
if errorlevel 1 goto falhou

:rodar
echo.
echo  Abrindo o app em http://localhost:5173
echo  Para parar, feche esta janela.
echo.
call npm run dev -- --open
pause
exit /b 0

:semnode
echo.
echo  Node.js nao encontrado neste computador.
echo  Instale a versao LTS em https://nodejs.org e de dois cliques aqui de novo.
echo.
pause
exit /b 1

:falhou
echo.
echo  O npm install falhou - veja a mensagem acima. Confira a internet e tente de novo.
echo.
pause
exit /b 1
