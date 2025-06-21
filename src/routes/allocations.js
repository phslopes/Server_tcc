// backend/routes/allocations.js
import express from 'express'
import {
  createAllocation,
  getAllAllocations,
  updateAllocationStatus,
  deleteAllocation
} from '../services/allocationService.js'
import {
  authenticateToken,
  authorizeRole
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all allocations with filters (Admin can see all, Professor only theirs)
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'professor', 'aluno']),
  async (req, res, next) => {
    try {
      // Pega todos os filtros da query string
      const {
        numeroSala,
        tipoSala,
        idProfessor,
        disciplinaNome,
        disciplinaTurno,
        ano,
        semestreAlocacao,
        tipoAlocacao,
        status,
        curso,
        semestreCurso
      } = req.query
      const filters = {
        numeroSala,
        tipoSala,
        idProfessor,
        disciplinaNome,
        disciplinaTurno,
        ano,
        semestreAlocacao,
        tipoAlocacao,
        status,
        curso,
        semestreCurso
      }

      let allocations
      if (req.user.role === 'admin' || req.user.role === 'aluno') {
        allocations = await getAllAllocations(filters)
        return res.json(allocations)
      } else if (req.user.role === 'professor') {
        // Professores só veem as suas, então adiciona o filtro de ID do usuário
        filters.idProfessor = req.user.id
        allocations = await getAllAllocations(filters)
        return res.json(allocations)
      }
      res.status(403).json({ message: 'Acesso negado.' })
    } catch (error) {
      next(error)
    }
  }
)

// Request a new allocation (RN006, RN007 - Professor and Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRole(['professor', 'admin']),
  async (req, res, next) => {
    try {
      const {
        numero_sala,
        tipo_sala,
        nome,
        turno,
        ano,
        semestre_alocacao,
        // tipo_alocacao agora é opcional no body, pois o banco tem DEFAULT
        // se não for enviado, o banco usará 'fixo'
        tipo_alocacao // Ainda lemos se ele for enviado
      } = req.body

      const id_professor = req.user.id

      // Ajustar validação: tipo_alocacao não precisa ser validado como obrigatório aqui
      if (
        !numero_sala ||
        !tipo_sala ||
        !nome ||
        !turno ||
        !ano ||
        !semestre_alocacao
        // Removido !tipo_alocacao daqui, pois é DEFAULT
      ) {
        return res.status(400).json({
          message:
            'Campos essenciais para a solicitação de alocação (exceto tipo_alocacao) são obrigatórios.'
        })
      }

      // Se tipo_alocacao for enviado, valida. Se não, o DB usa o DEFAULT.
      if (
        tipo_alocacao &&
        !['esporadico', 'fixo'].includes(tipo_alocacao.toLowerCase())
      ) {
        return res.status(400).json({
          message: 'Tipo de alocação inválido. Deve ser "esporadico" ou "fixo".'
        })
      }

      const newAllocation = await createAllocation(
        parseInt(numero_sala),
        tipo_sala.toLowerCase(),
        id_professor,
        nome,
        turno,
        parseInt(ano),
        parseInt(semestre_alocacao),
        tipo_alocacao ? tipo_alocacao.toLowerCase() : 'fixo' // Passa 'fixo' se não veio no body
      )
      res.status(201).json(newAllocation)
    } catch (error) {
      res.status(400).json({ message: error.message }) // Send specific error messages like "Sala já ocupada"
    }
  }
)

// Alteração: Update allocation status (Admin only)
// Usa a chave composta no URL e no corpo
router.put(
  '/:numeroSala/:tipoSala/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao/status',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res, next) => {
    try {
      const {
        numeroSala,
        tipoSala,
        idProfessor,
        nomeDisc,
        turnoDisc,
        ano,
        semestreAlocacao
      } = req.params
      const { status } = req.body
      if (
        !['confirmada', 'pendente', 'cancelada'].includes(status.toLowerCase())
      ) {
        return res.status(400).json({ message: 'Status de alocação inválido.' })
      }
      const updated = await updateAllocationStatus(
        parseInt(numeroSala),
        tipoSala.toLowerCase(),
        parseInt(idProfessor),
        nomeDisc,
        turnoDisc,
        parseInt(ano),
        parseInt(semestreAlocacao),
        status.toLowerCase()
      )
      if (!updated) {
        return res.status(404).json({ message: 'Alocação não encontrada.' })
      }
      res.json({ message: 'Status da alocação atualizado com sucesso.' })
    } catch (error) {
      next(error)
    }
  }
)

// Alteração: Delete an allocation (Admin only)
// Usa a chave composta no URL
router.delete(
  '/:numeroSala/:tipoSala/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res, next) => {
    try {
      const {
        numeroSala,
        tipoSala,
        idProfessor,
        nomeDisc,
        turnoDisc,
        ano,
        semestreAlocacao
      } = req.params
      const deleted = await deleteAllocation(
        parseInt(numeroSala),
        tipoSala.toLowerCase(),
        parseInt(idProfessor),
        nomeDisc,
        turnoDisc,
        parseInt(ano),
        parseInt(semestreAlocacao)
      )
      if (!deleted) {
        return res.status(404).json({ message: 'Alocação não encontrada.' })
      }
      res.json({ message: 'Alocação deletada com sucesso.' })
    } catch (error) {
      next(error)
    }
  }
)

export default router
