import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Tabs } from '@/components/ui/Tabs'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { useRoomStore } from '@/store/roomStore'
import { GameMode, Difficulty, DIFFICULTY_CONFIG } from '@minado/shared'

const modeOptions: { value: GameMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'competitive',
    label: 'Competitivo',
    description: 'Todos no mesmo tabuleiro. Maior pontuação vence.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    value: 'multi-board',
    label: 'Vários Tabuleiros',
    description: 'Cada jogador tem seu tabuleiro. Quem limpar primeiro vence.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    value: 'cooperative',
    label: 'Cooperativo',
    description: 'Um time, um tabuleiro. Erros são compartilhados. Dificuldade cresce.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: 'battle-royale',
    label: 'Battle Royale',
    description: 'Muitos jogadores, tabuleiros pequenos. Explodiu = eliminado. Último vence.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <path d="M12 22V12" />
        <path d="M12 2v10" />
      </svg>
    ),
  },
  {
    value: 'fog-of-war',
    label: 'Fog of War',
    description: 'Visão limitada. Um erro = game over do time. Cooperativo puro.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 18v-2" />
        <path d="M12 22v-8" />
        <path d="M12 14v-4" />
      </svg>
    ),
  },
]

const DEFAULT_TIME_LIMITS: Record<GameMode, number> = {
  competitive: 180,
  'multi-board': 180,
  cooperative: 0,
  'battle-royale': 300,
  'fog-of-war': 300,
}

const TIME_OPTIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
]

const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Fácil', description: '9×9, 10 minas — Para iniciantes' },
  { value: 'medium', label: 'Médio', description: '16×16, 40 minas — O clássico' },
  { value: 'hard', label: 'Difícil', description: '16×30, 99 minas — Desafio real' },
  { value: 'expert', label: 'Expert', description: '24×30, 150 minas — Para lendas' },
]

interface CreateRoomModalProps {
  open: boolean
  initialMode?: GameMode | null
  onClose: () => void
}

export function CreateRoomModal({ open, initialMode, onClose }: CreateRoomModalProps) {
  const navigate = useNavigate()

  const [roomName, setRoomName] = useState('')
  const [selectedMode, setSelectedMode] = useState<GameMode>('competitive')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [customRows, setCustomRows] = useState(16)
  const [customCols, setCustomCols] = useState(16)
  const [customMines, setCustomMines] = useState(40)
  const [useCustomBoard, setUseCustomBoard] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTimeLimit, setSelectedTimeLimit] = useState(DEFAULT_TIME_LIMITS['competitive'])

  // Reset + pre-seleção de modo quando o modal abre
  useEffect(() => {
    if (open) {
      const mode = initialMode ?? 'competitive'
      setRoomName('')
      setSelectedMode(mode)
      setSelectedDifficulty('medium')
      setIsPrivate(false)
      setPassword('')
      setMaxPlayers(8)
      setCustomRows(16)
      setCustomCols(16)
      setCustomMines(40)
      setUseCustomBoard(false)
      setError('')
      setLoading(false)
      setSelectedTimeLimit(DEFAULT_TIME_LIMITS[mode])
    }
  }, [open, initialMode])

  const handleModeChange = (mode: GameMode) => {
    setSelectedMode(mode)
    setSelectedTimeLimit(DEFAULT_TIME_LIMITS[mode])
  }

  const selectedModeInfo = modeOptions.find((m) => m.value === selectedMode)
  const difficultyConfig = DIFFICULTY_CONFIG[selectedDifficulty]

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!roomName.trim()) {
      setError('Digite um nome para a sala')
      setLoading(false)
      return
    }

    if (isPrivate && !password.trim()) {
      setError('Salas privadas precisam de senha')
      setLoading(false)
      return
    }

    if (useCustomBoard) {
      if (customRows < 5 || customRows > 50) {
        setError('Linhas devem ser entre 5 e 50')
        setLoading(false)
        return
      }
      if (customCols < 5 || customCols > 50) {
        setError('Colunas devem ser entre 5 e 50')
        setLoading(false)
        return
      }
      const maxMines = customRows * customCols - 1
      if (customMines < 1 || customMines > maxMines) {
        setError(`Minas devem ser entre 1 e ${maxMines}`)
        setLoading(false)
        return
      }
    }

    try {
      const boardConfig = useCustomBoard
        ? { rows: customRows, cols: customCols, mines: customMines }
        : undefined
      const timeLimit = selectedMode === 'cooperative' ? 0 : selectedTimeLimit
      const roomId = await useRoomStore.getState().createRoom(roomName, selectedMode, selectedDifficulty, isPrivate, password, maxPlayers, boardConfig, timeLimit)
      onClose()
      navigate(`/sala/${roomId}`, { replace: true, state: { justCreated: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sala')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar Sala" maxWidth="640px" closeOnBackdropClick>
      <p className="text-ink-muted text-body mb-4">Configure sua partida e chame a galera</p>
      <form onSubmit={handleCreateRoom} className="space-y-6">
        {/* Room Name */}
        <div>
          <Label htmlFor="roomName">Nome da Sala</Label>
          <Input
            id="roomName"
            placeholder="Ex: Turma do Fundão, Ranked Only, Diversão..."
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            maxLength={30}
            required
          />
        </div>

        {/* Game Mode Tabs */}
        <div>
          <Label>Modo de Jogo</Label>
          <Tabs defaultValue={selectedMode} className="mt-2">
            <div className="grid grid-cols-3 gap-1 bg-surface-muted rounded-[14px] p-1">
              {modeOptions.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => handleModeChange(mode.value)}
                  className={[
                    'relative py-3 px-2 rounded-[14px] text-left gap-2',
                    'font-heading font-bold text-small',
                    'transition-all duration-base',
                    selectedMode === mode.value
                      ? 'bg-surface text-primary-600 shadow-sm'
                      : 'bg-transparent text-ink-muted hover:bg-surface hover:text-ink',
                  ].join(' ')}
                >
                  <span className="w-5 h-5 flex-shrink-0">{mode.icon}</span>
                  <span className="font-heading font-bold text-small">{mode.label}</span>
                </button>
              ))}
            </div>
            <p className="text-small text-ink-muted pt-3">
              {selectedModeInfo?.description}
            </p>
          </Tabs>
        </div>

        {/* Difficulty / Board Config */}
        <div>
          <Label>
            {selectedMode === 'competitive' || selectedMode === 'cooperative' || selectedMode === 'fog-of-war'
              ? 'Dificuldade'
              : 'Tamanho do Tabuleiro'}
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {difficultyOptions.map((diff) => (
              <button
                key={diff.value}
                type="button"
                onClick={() => {
                  setSelectedDifficulty(diff.value)
                  setUseCustomBoard(false)
                }}
                className={[
                  'relative p-3 rounded-[14px] border-2 transition-all duration-base',
                  'font-heading font-bold text-small text-left',
                  selectedDifficulty === diff.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'border-border text-ink-muted hover:border-primary-300 hover:bg-surface-muted',
                ].join(' ')}
              >
                <span className="block">{diff.label}</span>
                <span className="text-[0.7rem] text-ink-muted block mt-0.5 font-body font-normal">
                  {diff.description}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Board Option */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomBoard}
                onChange={(e) => setUseCustomBoard(e.target.checked)}
                className="w-4 h-4 rounded-[8px] border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="font-heading font-bold text-small text-ink">Tabuleiro personalizado</span>
            </label>

            {useCustomBoard && (
              <div className="mt-4 grid grid-cols-3 gap-3 p-4 rounded-[14px] bg-surface-muted border border-border">
                <div>
                  <Label htmlFor="customRows">Linhas</Label>
                  <Input
                    id="customRows"
                    type="number"
                    min="5"
                    max="50"
                    value={customRows}
                    onChange={(e) => setCustomRows(Math.max(5, Math.min(50, parseInt(e.target.value) || 5)))}
                  />
                </div>
                <div>
                  <Label htmlFor="customCols">Colunas</Label>
                  <Input
                    id="customCols"
                    type="number"
                    min="5"
                    max="50"
                    value={customCols}
                    onChange={(e) => setCustomCols(Math.max(5, Math.min(50, parseInt(e.target.value) || 5)))}
                  />
                </div>
                <div>
                  <Label htmlFor="customMines">Minas</Label>
                  <Input
                    id="customMines"
                    type="number"
                    min="1"
                    max={customRows * customCols - 1}
                    value={customMines}
                    onChange={(e) => setCustomMines(Math.max(1, Math.min(customRows * customCols - 1, parseInt(e.target.value) || 1)))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout: Room Settings (left) + Preview (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Room Settings */}
          <div className="space-y-4">
            <div className="p-4 rounded-[14px] bg-surface-muted border border-border space-y-4">
              <h4 className="font-heading font-bold text-h6">Configurações da Sala</h4>

              {/* Private/Public Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-bold text-small text-ink">Sala privada</p>
                  <p className="text-[0.75rem] text-ink-muted">Apenas quem tem o link/senha entra</p>
                </div>
                <Switch
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
              </div>

              {isPrivate && (
                <div>
                  <Label htmlFor="roomPassword">Senha (opcional)</Label>
                  <Input
                    id="roomPassword"
                    type="password"
                    placeholder="Deixe vazio para usar apenas link de convite"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              {/* Max Players */}
              <div>
                <Label htmlFor="maxPlayers">Máximo de jogadores</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="maxPlayers"
                    type="range"
                    min={selectedMode === 'battle-royale' ? '10' : '2'}
                    max={selectedMode === 'battle-royale' ? '50' : '16'}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-surface rounded-full appearance-none cursor-pointer accent-primary-500"
                  />
                  <span className="font-heading font-bold text-h5 text-ink min-w-[3rem] text-center">{maxPlayers}</span>
                </div>
                <p className="text-[0.75rem] text-ink-muted mt-1">
                  {selectedMode === 'battle-royale'
                    ? 'Battle Royale suporta 10-50 jogadores'
                    : 'Mínimo 2, máximo 16 jogadores'}
                </p>
              </div>

              {/* Timer */}
              <div>
                <Label htmlFor="timeLimit">Limite de Tempo</Label>
                {selectedMode === 'cooperative' ? (
                  <div className="p-3 rounded-[14px] bg-surface border border-border">
                    <p className="font-heading font-bold text-small text-ink">Sem limite</p>
                    <p className="text-[0.75rem] text-ink-muted">O cooperativo não possui limite de tempo</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      id="timeLimit"
                      type="range"
                      min="1"
                      max="5"
                      value={TIME_OPTIONS.findIndex((o) => o.value === selectedTimeLimit) >= 0
                        ? TIME_OPTIONS.findIndex((o) => o.value === selectedTimeLimit)
                        : 2}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value)
                        setSelectedTimeLimit(TIME_OPTIONS[idx].value)
                      }}
                      className="flex-1 h-2 bg-surface rounded-full appearance-none cursor-pointer accent-primary-500"
                    />
                    <span className="font-heading font-bold text-h5 text-ink min-w-[4rem] text-center">
                      {selectedTimeLimit >= 60
                        ? `${Math.floor(selectedTimeLimit / 60)}:${(selectedTimeLimit % 60).toString().padStart(2, '0')}`
                        : `${selectedTimeLimit}s`}
                    </span>
                  </div>
                )}
                <p className="text-[0.75rem] text-ink-muted mt-1">
                  {selectedMode === 'cooperative'
                    ? 'Jogue sem pressão!'
                    : 'O jogo encerra automaticamente quando o tempo acabar'}
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {error && <Alert variant="error" className="mb-2">{error}</Alert>}
          </div>

          {/* RIGHT COLUMN: Preview (sticky to top) */}
          <div className="lg:sticky lg:top-6">
            <div className="p-4 rounded-[14px] bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <h4 className="font-heading font-bold text-small text-primary-700 dark:text-primary-300 mb-2">Resumo da Sala</h4>
              <div className="grid grid-cols-2 gap-2 text-small">
                <span className="text-ink-muted">Modo</span>
                <span className="font-heading font-bold text-ink">{selectedModeInfo?.label}</span>
                <span className="text-ink-muted">Dificuldade</span>
                <span className="font-heading font-bold text-ink">
                  {useCustomBoard
                    ? `${customRows}×${customCols}, ${customMines} minas`
                    : `${difficultyConfig.rows}×${difficultyConfig.cols}, ${difficultyConfig.mines} minas`}
                </span>
                <span className="text-ink-muted">Privacidade</span>
                <span className="font-heading font-bold text-ink">{isPrivate ? 'Privada' : 'Pública'}</span>
                <span className="text-ink-muted">Máx. jogadores</span>
                <span className="font-heading font-bold text-ink">{maxPlayers}</span>
                <span className="text-ink-muted">Limite de tempo</span>
                <span className="font-heading font-bold text-ink">
                  {selectedMode === 'cooperative'
                    ? 'Sem limite'
                    : `${Math.floor(selectedTimeLimit / 60)}:${(selectedTimeLimit % 60).toString().padStart(2, '0')} min`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit buttons - full width */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={loading}>
            Criar Sala
          </Button>
        </div>
      </form>
    </Modal>
  )
}