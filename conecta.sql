
CREATE DATABASE IF NOT EXISTS biblioteca_conecta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteca_conecta;

CREATE TABLE Leitor (
    id_leitor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Acervo (
    id_acervo INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    genero VARCHAR(80) NOT NULL,
    exemplares_disponiveis INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_exemplares CHECK (exemplares_disponiveis >= 0)
);

CREATE TABLE Movimentacao (
    id_movimentacao INT AUTO_INCREMENT PRIMARY KEY,
    data_retirada DATE NOT NULL,
    data_limite DATE NOT NULL,
    data_retorno DATE NULL,
    id_leitor INT NOT NULL,
    id_acervo INT NOT NULL,

    CONSTRAINT fk_mov_leitor
        FOREIGN KEY (id_leitor)
        REFERENCES Leitor(id_leitor),

    CONSTRAINT fk_mov_acervo
        FOREIGN KEY (id_acervo)
        REFERENCES Acervo(id_acervo),

    CONSTRAINT chk_prazos CHECK (
        data_limite >= data_retirada
        AND (
            data_retorno IS NULL
            OR data_retorno >= data_retirada
        )
    )
);

INSERT INTO Acervo
(titulo, autor, genero, exemplares_disponiveis)
VALUES
('Iracema', 'José de Alencar', 'Romance', 3),
('A Bolsa Amarela', 'Lygia Bojunga', 'Infantojuvenil', 4),
('Vidas Secas', 'Graciliano Ramos', 'Literatura brasileira', 2),
('Percy Jackson', 'Rick Riordan', 'Fantasia', 5),
('O Alienista', 'Machado de Assis', 'Conto', 3);
