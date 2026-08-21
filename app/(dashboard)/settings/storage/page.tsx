"use client";

import React, { useState, useEffect } from "react";
import { HardDrive, Plus, Trash2, Check, Cloud, ShieldAlert } from "lucide-react";
import { StorageCredential } from "@/lib/api/backups";

export default function StorageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<StorageCredential[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("r2");
  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    setLoading(true);
    try {
      const res = await fetch("/api/backups/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (err) {
      console.error("Error loading credentials:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/backups/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider,
          endpoint,
          bucket,
          region,
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
          is_default: isDefault,
        }),
      });

      if (res.ok) {
        setName("");
        setEndpoint("");
        setBucket("");
        setAccessKeyId("");
        setSecretAccessKey("");
        alert("Credencial de almacenamiento añadida correctamente.");
        loadCredentials();
      } else {
        const err = await res.json();
        alert(`Error al guardar credencial: ${err.error || "Fallo desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de comunicación.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta credencial de almacenamiento?")) return;
    try {
      const res = await fetch(`/api/backups/credentials/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadCredentials();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al eliminar la credencial: ${err.error || "Fallo desconocido"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cloud className="w-7 h-7 text-blue-400" /> Almacenamiento R2 / S3 para Respaldos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configura tus buckets de Cloudflare R2, AWS S3 o MinIO para guardar las copias de seguridad de tus servidores.
        </p>
      </div>

      {/* FORM TO ADD CREDENTIAL */}
      <form onSubmit={handleCreateCredential} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <h3 className="text-md font-semibold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" /> Añadir Nueva Credencial de Almacenamiento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Identificador</label>
            <input
              type="text"
              placeholder="Ej: Cloudflare R2 Producción"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Proveedor / Tipo</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="r2">Cloudflare R2</option>
              <option value="s3">AWS S3 Compatible</option>
              <option value="minio">MinIO (Self-hosted)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">S3 Endpoint URL</label>
            <input
              type="text"
              placeholder="https://<account_id>.r2.cloudflarestorage.com"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Bucket</label>
            <input
              type="text"
              placeholder="autohost-backups"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Access Key ID</label>
            <input
              type="text"
              placeholder="R2/S3 Access Key"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Secret Access Key</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 text-blue-600 focus:ring-0"
            />
            Establecer como almacenamiento predeterminado para nuevos respaldos
          </label>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Credencial"}
          </button>
        </div>
      </form>

      {/* CREDENTIALS LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-md font-semibold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" /> Credenciales Configuradas
        </h3>

        {loading ? (
          <div className="py-6 text-center text-slate-500 text-sm">Cargando credenciales...</div>
        ) : credentials.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-sm">
            No tienes ninguna credencial de almacenamiento S3/R2 registrada aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentials.map((c) => (
              <div
                key={c.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      {c.name}
                      {c.is_default && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
                          Predeterminado
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">Bucket: {c.bucket}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 transition"
                    title="Eliminar credencial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-mono truncate">
                  Endpoint: {c.endpoint}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
