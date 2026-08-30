'use strict'

//aqui estamos pegando todas as variaveis do CSS e colocando no JS, para que seja possivel "manipular" elas depois.
const input_nome = document.querySelector(".nome")

const input_sobrenome = document.querySelector(".sobrenome")

const input_email = document.querySelector(".email")

const input_data = document.querySelector(".data")

const input_cpf = document.querySelector(".cpf")

const input_empresa = document.querySelector(".empresa")

const input_cargo = document.querySelector(".cargo")

const btn_prosseguir = document.querySelector(".prosseguir")


btn_prosseguir.addEventListener("click", function(){
    const nomeDigitado = input_nome.value;

    const sobrenomeDigitado = input_sobrenome.value;


    const emailDigitado = input_email.value;

    const dataDigitado = input_data.value;

    const cpfDigitado = input_cpf.value;

    const empresaDigitado = input_empresa.value;

    const cargoDigitado = input_cargo.value;

    const dadosEnvio = {
    nome : nomeDigitado,
    sobrenome : sobrenomeDigitado,
    email : emailDigitado,
    data : dataDigitado,
    cpf : cpfDigitado,
    empresa : empresaDigitado,
    cargo : cargoDigitado
}




    const dadosemJson = JSON.stringify(dadosEnvio)


    fetch("http://localhost:8000/usuarios",{

        method:"post",

        headers:{
            "Content-Type": "application/json"
        },
        body:dadosemJson
    })
    .then(function(resposta){
        alert("Dados enviado com sucesso")
    })

})



