import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Alert } from '@/components/ui/Alert'
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

const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Fácil', description: '9×9, 10 minas — Para iniciantes' },
  { value: 'medium', label: 'Médio', description: '16×16, 40 minas — O clássico' },
  { value: 'hard', label: 'Difícil', description: '16×30, 99 minas — Desafio real' },
  { value: 'expert', label: 'Expert', description: '24×30, 150 minas — Para lendas' },
]

export function CreateRoomPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedMode = searchParams.get('mode') as GameMode | null

  const [roomName, setRoomName] = useState('')
  const [selectedMode, setSelectedMode] = useState<GameMode>(preSelectedMode || 'competitive')
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
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdRoomId, setCreatedRoomId] = useState('')

  const selectedModeInfo = modeOptions.find((m) => m.value === selectedMode)
  const difficultyConfig = DIFFICULTY_CONFIG[selectedDifficulty]

  const handleCreateRoom = async (e: React.FormEvent) => {
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

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000))

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setCreatedRoomId(roomId)
    setShowSuccessModal(true)
    setLoading(false)
  }

  const handleSuccessContinue = () => {
    setShowSuccessModal(false)
    navigate(`/sala/${createdRoomId}`, { replace: true })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-12">
      <Card variant="elevated" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="mb-1">Criar Sala</CardTitle>
          <p className="text-ink-muted text-body">Configure sua partida e chame a galera</p>
        </CardHeader>

        <CardContent>
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
                      onClick={() => setSelectedMode(mode.value)}
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

            {/* Room Settings */}
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
            </div>

            {/* Preview */}
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
              </div>
            </div>

            {error && <Alert variant="error" className="mb-2">{error}</Alert>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex-1" loading={loading}>
                Criar Sala
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Modal open={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Sala Criada!">
        <div className="text-center py-2">
          <div className="w-16 h-16 rounded-full bg-success-soft grid place-items-center mx-auto mb-4 text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-heading font-bold text-h5 mb-2">Sala <span className="text-primary-600">{createdRoomId}</span> criada!</h3>
          <p className="text-ink-muted text-body mb-4">Compartilhe o código ou o link para seus amigos entrarem.</p>
          <div className="p-3 rounded-[14px] bg-surface-muted border border-border font-mono text-h6 font-bold text-primary-600">
            {createdRoomId}
          </div>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowSuccessModal(false)}>Fechar</Button>
          <Button variant="primary" onClick={handleSuccessContinue}>Entrar na Sala</Button>
        </ModalActions>
      </Modal>
    </div>
  )
}