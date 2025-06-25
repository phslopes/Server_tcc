USE classroom_scheduler;
DROP TABLE IF EXISTS alocacao;
DROP TABLE IF EXISTS professor_disciplina;
DROP TABLE IF EXISTS disciplina;
DROP TABLE IF EXISTS professor;
DROP TABLE IF EXISTS sala;
DROP TABLE IF EXISTS users;

-- Tabela para Usuários
CREATE TABLE users (
    id_user INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Armazena senhas hashed
    role ENUM('admin', 'professor', 'aluno') NOT NULL
);

-- Tabela para Professor
CREATE TABLE professor (
    id_professor INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE,
    telefone VARCHAR(20),
    nome VARCHAR(100) NOT NULL
);

-- Tabela para Disciplina
CREATE TABLE disciplina (
    nome VARCHAR(100) NOT NULL,
    turno VARCHAR(20),
    carga INT,
    semestre_curso INT,
    curso VARCHAR(100) NOT NULL,
    PRIMARY KEY (nome, turno)
);

-- Tabela para Sala
CREATE TABLE sala (
    numero_sala INT NOT NULL,
    tipo_sala ENUM('sala', 'laboratorio') NOT NULL DEFAULT 'sala',
    status ENUM('livre', 'ocupada') DEFAULT 'livre',
    PRIMARY KEY (numero_sala, tipo_sala)
);

-- Tabela para Professor_Disciplina
CREATE TABLE professor_disciplina (
    id_professor INT,
    nome VARCHAR(100),
    turno VARCHAR(20),
    ano INT, 
    semestre_alocacao INT, 
    dia_semana INT, 
    hora_inicio TIME,
    PRIMARY KEY (id_professor, nome, turno, ano, semestre_alocacao),
    FOREIGN KEY (id_professor) REFERENCES professor(id_professor)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (nome, turno) REFERENCES disciplina(nome, turno)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela para Alocacao
CREATE TABLE alocacao (
    numero_sala INT NOT NULL,
    tipo_sala ENUM('sala', 'laboratorio') NOT NULL,
    id_professor INT NOT NULL,
    ano INT,
    semestre_alocacao INT,
    nome VARCHAR(100),
    turno VARCHAR(20),
    tipo_alocacao ENUM('esporadico', 'fixo') DEFAULT 'fixo',
    status ENUM('Confirmada', 'Pendente', 'Cancelada') DEFAULT 'Pendente',
    dia_semana INT,
    hora_inicio TIME,
    PRIMARY KEY (numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio),
    FOREIGN KEY (numero_sala, tipo_sala) REFERENCES sala(numero_sala, tipo_sala)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_professor, nome, turno, ano, semestre_alocacao) REFERENCES professor_disciplina(id_professor, nome, turno, ano, semestre_alocacao)
        ON DELETE CASCADE ON UPDATE CASCADE
);
