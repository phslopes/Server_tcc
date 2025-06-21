// backend/routes/allocations.js
import express from 'express'
import {
  createAllocation,
  getAllAllocations,
  getAllocationsByProfessor,
  updateAllocationStatus,
  deleteAllocation
} from '../services/allocationService.js'
import {
  authenticateToken,
  authorizeRole
} from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all allocations (Admin can see all, Professor only theirs)
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'professor', 'aluno']),
  async (req, res, next) => {
    try {
      if (req.user.role === 'admin' || req.user.role === 'aluno') {
        const allocations = await getAllAllocations()
        return res.json(allocations)
      } else if (req.user.role === 'professor') {
        const allocations = await getAllocationsByProfessor(req.user.id)
        return res.json(allocations)
      }
    } catch (error) {
      next(error)
    }
  }
)

// Request a new allocation (RN006, RN007 - Professor only)
router.post(
  '/',
  authenticateToken,
  authorizeRole(['professor']),
  async (req, res, next) => {
    try {
      const {
        numero_sala,
        tipo_sala,
        nome,
        turno,
        ano,
        semestre_alocacao,
        tipo_alocacao
      } = req.body
      const id_professor = req.user.id

      // Basic validation
      if (
        !numero_sala ||
        !tipo_sala ||
        !nome ||
        !turno ||
        !ano ||
        !semestre_alocacao ||
        !tipo_alocacao
      ) {
        return res
          .status(400)
          .json({
            message:
              'Todos os campos são obrigatórios para a solicitação de alocação.'
          })
      }
      // ENUMs em lowercase
      if (!['esporadico', 'fixo'].includes(tipo_alocacao.toLowerCase())) {
        return res
          .status(400)
          .json({
            message:
              'Tipo de alocação inválido. Deve ser "esporadico" ou "fixo".'
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
        tipo_alocacao.toLowerCase()
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
        // ENUMs em lowercase
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
