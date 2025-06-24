// backend/routes/allocations.js
import express from 'express'
import {
  createAllocation,
  getAllAllocations,
  updateAllocationStatus,
  deleteAllocation,
  changeAllocationRoom,
  checkRoomAvailabilityForReservation,
  checkProfessorSchedule,
  checkRoomAvailabilityOnly,
  updateAllocationStatusById
} from '../services/allocationService.js'
import {
  authenticateToken,
  authorizeRole
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'professor', 'aluno']),
  async (req, res, next) => {
    try {
      const filters = req.query
      let allocations
      if (req.user.role === 'admin' || req.user.role === 'aluno') {
        allocations = await getAllAllocations(filters)
      } else if (req.user.role === 'professor') {
        filters.idProfessor = req.user.id
        allocations = await getAllAllocations(filters)
      } else {
        return res.status(403).json({ message: 'Acesso negado.' })
      }
      return res.json(allocations)
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  '/',
  authenticateToken,
  authorizeRole(['professor', 'admin']),
  async (req, res, next) => {
    try {
      const {
        numero_sala,
        tipo_sala,
        id_professor,
        nome,
        turno,
        ano,
        semestre_alocacao,
        tipo_alocacao,
        dia_semana,
        hora_inicio
      } = req.body

      if (
        !numero_sala ||
        !tipo_sala ||
        !id_professor ||
        !nome ||
        !turno ||
        !ano ||
        !semestre_alocacao ||
        !dia_semana ||
        !hora_inicio
      ) {
        return res
          .status(400)
          .json({
            message:
              'Todos os campos para a solicitação de alocação são obrigatórios.'
          })
      }

      const newAllocation = await createAllocation(
        parseInt(numero_sala),
        tipo_sala.toLowerCase(),
        parseInt(id_professor),
        nome,
        turno,
        parseInt(ano),
        parseInt(semestre_alocacao),
        tipo_alocacao ? tipo_alocacao.toLowerCase() : 'fixo',
        parseInt(dia_semana),
        hora_inicio,
        req.user.role
      )
      res.status(201).json(newAllocation)
    } catch (error) {
      res.status(400).json({ message: error.message })
    }
  }
)

router.put(
  '/:numeroSala/:tipoSala/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao/:diaSemana/:horaInicio/status',
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
        semestreAlocacao,
        diaSemana,
        horaInicio
      } = req.params
      const { status } = req.body
      if (
        !['confirmada', 'pendente', 'cancelada'].includes(status.toLowerCase())
      ) {
        return res.status(400).json({ message: 'Status de alocação inválido.' })
      }
      const updated = await updateAllocationStatusById(
        parseInt(numeroSala),
        tipoSala.toLowerCase(),
        parseInt(idProfessor),
        nomeDisc,
        turnoDisc,
        parseInt(ano),
        parseInt(semestreAlocacao),
        parseInt(diaSemana),
        horaInicio,
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

router.put(
  '/change-room/:numeroSala/:tipoSala/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res, next) => {
    try {
      const oldAllocationPK = {
        numeroSala: req.params.numeroSala,
        tipoSala: req.params.tipoSala,
        idProfessor: req.params.idProfessor,
        nomeDisc: req.params.nomeDisc,
        turnoDisc: req.params.turnoDisc,
        ano: req.params.ano,
        semestreAlocacao: req.params.semestreAlocacao
      }
      const { new_numero_sala, new_tipo_sala } = req.body

      if (!new_numero_sala || !new_tipo_sala) {
        return res.status(400).json({ message: 'A nova sala é obrigatória.' })
      }

      await changeAllocationRoom(oldAllocationPK, {
        new_numero_sala,
        new_tipo_sala
      })

      res.json({ message: 'Sala da alocação alterada com sucesso.' })
    } catch (error) {
      next(error)
    }
  }
)

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

router.get(
  '/availability',
  authenticateToken,
  authorizeRole(['professor', 'admin']),
  async (req, res, next) => {
    try {
      const {
        id_professor,
        nome,
        turno,
        ano,
        semestre_alocacao,
        dia_semana,
        hora_inicio
      } = req.query

      if (!id_professor || !nome || !turno || !ano || !semestre_alocacao || !dia_semana || !hora_inicio) {
        return res.status(400).json({
          message: 'Todos os parâmetros são obrigatórios: id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio'
        })
      }

      const availableRooms = await checkRoomAvailabilityForReservation(
        parseInt(id_professor),
        nome,
        turno,
        parseInt(ano),
        parseInt(semestre_alocacao),
        parseInt(dia_semana),
        hora_inicio
      )

      res.json(availableRooms)
    } catch (error) {
      next(error)
    }
  }
)

// Novo endpoint para verificar se professor tem aula programada
router.get(
  '/check-schedule',
  authenticateToken,
  authorizeRole(['professor', 'admin']),
  async (req, res, next) => {
    try {
      const {
        id_professor,
        nome,
        turno,
        ano,
        semestre_alocacao,
        dia_semana,
        hora_inicio
      } = req.query

      if (!id_professor || !nome || !turno || !ano || !semestre_alocacao || !dia_semana || !hora_inicio) {
        return res.status(400).json({
          message: 'Todos os parâmetros são obrigatórios: id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio'
        })
      }

      const hasSchedule = await checkProfessorSchedule(
        parseInt(id_professor),
        nome,
        turno,
        parseInt(ano),
        parseInt(semestre_alocacao),
        parseInt(dia_semana),
        hora_inicio
      )

      res.json({ hasSchedule })
    } catch (error) {
      next(error)
    }
  }
)

// Novo endpoint para verificar disponibilidade de salas (sem verificar programação)
router.get(
  '/room-availability',
  authenticateToken,
  authorizeRole(['professor', 'admin']),
  async (req, res, next) => {
    try {
      const {
        dia_semana,
        hora_inicio
      } = req.query

      if (!dia_semana || !hora_inicio) {
        return res.status(400).json({
          message: 'Parâmetros obrigatórios: dia_semana, hora_inicio'
        })
      }

      const availableRooms = await checkRoomAvailabilityOnly(
        parseInt(dia_semana),
        hora_inicio
      )

      res.json(availableRooms)
    } catch (error) {
      next(error)
    }
  }
)

export default router
