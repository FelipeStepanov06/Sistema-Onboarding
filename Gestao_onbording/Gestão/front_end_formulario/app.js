'use strict'


document.addEventListener("DOMContentLoaded", function() {
    const inputHabilidade = document.getElementById('inputHabilidade');
    const containerTags = document.getElementById('containerTags');
    
    if (inputHabilidade && containerTags) {
        inputHabilidade.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                
                if (inputHabilidade.value.trim() !== '') {
                    const tag = document.getElementById('div');
                    
                    tag.classList.add('tag');
                    
                    const textoHabilidade = inputHabilidade.value.trim();

                    tag.innerHTML=`
                        <span>${textoHabilidade}</span>
                        <button type = "button" class = "botao_remover">x</button>`

                        const botaoX = tag.querySelector('.botao_remover');

                        botaoX.addEventListener("click", function(){
                            tag.remove();
                        });

                    }

                containerTags.insertBefore(tag,inputHabilidade)
                inputHabilidade.value ='';            
            }
        });
    }
});



const input_nome = document.querySelector(".nome");
const input_sobrenome = document.querySelector(".sobrenome");
const input_email = document.querySelector(".email");
const input_data = document.querySelector(".data");
const input_cpf = document.querySelector(".cpf");
const input_empresa = document.querySelector(".empresa");
const input_cargo = document.querySelector(".cargo");
const btn_prosseguir = document.querySelector(".prosseguir"); // Verifique se a classe do seu botão no HTML não é .inscricao

if (btn_prosseguir) {
    btn_prosseguir.addEventListener("click", function(){
        
        const dadosEnvio = {
            nome : input_nome.value,
            sobrenome : input_sobrenome ? input_sobrenome.value : "", // Prevenção caso o campo não exista
            email : input_email.value,
            data : input_data.value,
            cpf : input_cpf.value,
            empresa : input_empresa.value,
            cargo : input_cargo.value
        };

        const dadosemJson = JSON.stringify(dadosEnvio);

        fetch("http://localhost:8000/usuarios",{
            method:"post",
            headers:{
                "Content-Type": "application/json"
            },
            body:dadosemJson
        })
        .then(function(resposta){
            alert("Dados enviados com sucesso");
        });
    });
}