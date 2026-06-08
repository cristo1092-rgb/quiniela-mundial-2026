"use client";
import { useState } from "react";

export default function HowToPlay() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📋</span> Información y reglas de la quiniela
        </span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-5 pt-2 border-t border-gray-100 text-sm text-gray-600 space-y-5">

          {/* Entry fee & prizes */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">💰 Entrada y premios</p>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Costo de entrada</span>
                <span className="font-bold text-xl text-green-700">$500 MXN</span>
              </div>
              <div className="border-t border-green-200 pt-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Distribución del pozo</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥇</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-800">1er lugar</span>
                      <span className="font-bold text-yellow-600">70%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: "70%" }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥈</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-800">2do lugar</span>
                      <span className="font-bold text-gray-500">20%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: "20%" }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥉</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-800">3er lugar</span>
                      <span className="font-bold text-amber-600">10%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "10%" }} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 border-t border-green-200 pt-2">
                * El monto final del pozo depende del número de participantes.
              </p>
            </div>
          </div>

          {/* How to join */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">🚀 ¿Cómo participar?</p>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="font-medium text-gray-800">Realiza tu depósito</p>
                  <p className="text-xs text-gray-500 mt-0.5">Envía <strong>$500 MXN</strong> a la cuenta DIMO desde cualquier banco:</p>
                  <div className="mt-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-base font-bold text-gray-800 tracking-widest text-center">
                    5576 6977 35
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Cuenta DIMO — se puede transferir desde cualquier banco</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  <p className="font-medium text-gray-800">Manda tu comprobante por WhatsApp</p>
                  <p className="text-xs text-gray-500 mt-0.5">Envía el comprobante de depósito al mismo número:</p>
                  <a
                    href="https://wa.me/5215576697735"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 flex items-center gap-2 bg-[#25D366] text-white text-sm font-bold px-3 py-2 rounded-lg w-fit"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp · 55 7669 7735
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center">3</span>
                <div>
                  <p className="font-medium text-gray-800">Recibe tu acceso</p>
                  <p className="text-xs text-gray-500 mt-0.5">Una vez confirmada tu transferencia, el organizador te asignará tu nombre de usuario. Tú eliges tu propio PIN de acceso la primera vez que entres.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* How to predict */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">⚽ Cómo hacer predicciones</p>
            <ol className="space-y-1.5 list-decimal list-inside text-sm">
              <li>Navega por los grupos (A–L) y las eliminatorias</li>
              <li>En cada partido escribe el <strong>marcador exacto</strong> que predices (ej. <code className="bg-gray-100 px-1 rounded">2 — 1</code>)</li>
              <li>El sistema deduce automáticamente si es victoria local, empate o visitante</li>
              <li>Puedes cambiar tus predicciones hasta la medianoche del día del partido</li>
            </ol>
          </div>

          {/* Points */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">🏅 Sistema de puntos</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">⭐ 5</div>
                <div className="text-xs mt-1 text-yellow-700 font-medium">Marcador exacto</div>
                <div className="text-xs text-yellow-600 mt-0.5">Predices 2-1, sale 2-1</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">✓ 3</div>
                <div className="text-xs mt-1 text-green-700 font-medium">Resultado correcto</div>
                <div className="text-xs text-green-600 mt-0.5">Acertaste quién gana o empate</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">0 puntos si el resultado es incorrecto.</p>
          </div>

          {/* Disclaimer */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 space-y-1.5">
            <p className="font-semibold text-gray-600">⚠️ Aviso importante</p>
            <p>Esta quiniela es <strong>exclusivamente para amigos y familiares</strong> del organizador. No está permitido compartir el link con personas fuera de este círculo.</p>
            <p>La participación es voluntaria y con fines únicamente de entretenimiento entre personas conocidas. El organizador no es responsable de ningún conflicto derivado de la participación.</p>
            <p>No estamos afiliados a FIFA ni a ninguna organización deportiva oficial. Esta plataforma no constituye una casa de apuestas ni una actividad comercial regulada.</p>
          </div>

        </div>
      )}
    </div>
  );
}
